/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/antiban.js — el freno: cola de envíos, ritmo y vigilancia.
 *
 * Qué problema resuelve, en corto: un bot que contesta al instante, siempre al
 * mismo ritmo y a la misma velocidad máxima, se parece mucho a un bot. Lo que
 * hace este archivo es tres cosas, y ninguna es magia:
 *
 *   1. RITMO (`crearLimitador`): cada envío espera un poco, y ese «poco» varía
 *      al azar con una campana (jitter gaussiano), no con un número fijo. Los
 *      textos largos esperan más (más teclado); los comandos urgentes (.menu,
 *      .ping) esperan lo mínimo.
 *   2. CALENTAMIENTO: una cuenta nueva no manda 500 mensajes el primer día.
 *      El tope diario sube poco a poco durante una semana hasta el máximo. El
 *      contador se guarda en la base, así que reiniciar no lo pone a cero.
 *   3. COLA (`crearCola`): si dos cosas quieren escribir a la vez, salen de una
 *      en una. Si la conexión se cae, el mensaje ESPERA y sale al volver (no se
 *      reintenta a ciegas ni se pierde). Y si se queda sin respuesta, no se
 *      repite nunca: mejor perder uno que mandar dos iguales.
 *
 * Lo que este archivo NO hace: garantizar que una cuenta no sea bloqueada. No
 * existe forma de garantizarlo. Baja el riesgo; no lo elimina.
 */


/** Marca de «no sé si salió». Se distingue de un fallo seguro a propósito. */
export const CODIGO_INCIERTO = "ENVIO_INCIERTO";

/** ¿Falló porque la conexión está caída? (el fotograma no llegó a salir) */
export function esFalloDeConexion(err) {
  if (!err) return false;
  const texto = String(err.message || err);
  if (err.code === CODIGO_INCIERTO) return false; // incógnita, no caída
  return /connection closed|connection failure|connection terminated|socket is not open|not connected|sin conexión/i.test(
    texto
  );
}

/** Una promesa con plazo: si no contesta, es una incógnita, no un fallo. */
function conPlazo(promesa, ms, etiqueta) {
  return new Promise((resolver, rechazar) => {
    const reloj = setTimeout(() => {
      const err = new Error(`${etiqueta} superó ${ms} ms sin respuesta`);
      err.code = CODIGO_INCIERTO;
      rechazar(err);
    }, ms);
    Promise.resolve(promesa).then(
      (v) => {
        clearTimeout(reloj);
        resolver(v);
      },
      (e) => {
        clearTimeout(reloj);
        rechazar(e);
      }
    );
  });
}

import { curvaCircadiana, planDeEscritura } from "./ritmo.js";

/** Número al azar con forma de campana (Box-Muller). */
export function gaussiana(media, desviacion) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return media + desviacion * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function numeroDeEntorno(nombre, porDefecto) {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo === "") return porDefecto;
  const n = Number(crudo);
  return Number.isFinite(n) && n >= 0 ? n : porDefecto;
}

/**
 * Perfiles de calentamiento.
 *
 * · `auto`     la rampa normal: empieza en `WARMUP_START_MSGS` y sube hasta
 *              `WARMUP_MAX_MSGS` a lo largo de `WARMUP_DAYS` días.
 * · `nuevo`    fuerza la rampa aunque el entorno diga otra cosa.
 * · `veterano` sin rampa: el tope máximo desde el primer día. Es para cuando
 *              ya no quieres esperar días a que el bot suelte la mano.
 *
 * El perfil se puede fijar por entorno (`WARMUP_PERFIL`) o cambiar en caliente
 * con `.warmup veterano confirmar`; lo que se cambie en caliente se guarda en la
 * base y manda sobre el entorno.
 */
export const PERFILES = ["auto", "nuevo", "veterano"];

/** El aviso que se enseña antes y después de pasar a veterano. */
export const AVISO_VETERANO = [
  "⚠️ *Perfil veterano*",
  "",
  "Se acaba la rampa de días: el bot puede mandar hasta el tope máximo desde hoy mismo.",
  "",
  "*Lo que ganas*",
  "▸ Ningún envío espera por «día 1»: se desbloquea el tope entero.",
  "",
  "*Lo que arriesgas*",
  "▸ Un número nuevo que pasa de 20 a 500 mensajes en un día es el patrón que más se parece a un disparo masivo. Es la causa típica de restricción.",
  "▸ El anti-ban deja de protegerte justo cuando más sirve: las primeras semanas de un número.",
  "▸ Sigue la espera entre envíos y la pausa por denuncias: veterano quita la rampa, no los frenos.",
  "",
  "> Úsalo con un número que ya tenga meses de uso normal, o mientras pruebas.",
].join("\n");

/** Perfil pedido por entorno. Devuelve `auto` si el valor no se entiende. */
export function perfilDeEntorno() {
  const crudo = String(process.env.WARMUP_PERFIL || "auto").toLowerCase().trim();
  return PERFILES.includes(crudo) ? crudo : "auto";
}

/** Ajustes del ritmo. Se pueden cambiar por entorno sin tocar código. */
export function ajustesDeRitmo() {
  return {
    perfil: perfilDeEntorno(),
    activo: String(process.env.ANTIBAN || "").toLowerCase() !== "off",
    baseMs: numeroDeEntorno("ANTIBAN_BASE_MS", 1200),
    desviacion: 0.25,
    minimoMs: numeroDeEntorno("ANTIBAN_MIN_MS", 400),
    maximoMs: numeroDeEntorno("ANTIBAN_MAX_MS", 5000),
    msPorLetra: 25,
    penalizacionNuevo: 1.5,
    diasCalentamiento: numeroDeEntorno("WARMUP_DAYS", 7),
    // Un negocio de verdad no manda 500 mensajes al día por WhatsApp: contesta.
    // Los números de la comunidad para un número con historia rondan los 200;
    // por encima de eso se entra en la zona que las guías marcan como peligrosa.
    inicioMsgsDia: numeroDeEntorno("WARMUP_START_MSGS", 10),
    maxMsgsDia: numeroDeEntorno("WARMUP_MAX_MSGS", 200),
    // La hora que es también pesa: de noche una persona va más despacio.
    circadiano: String(process.env.RITMO || "").toLowerCase() !== "off",
  };
}

/**
 * El limitador: cuánto se espera antes de enviar y cuánto se ha enviado hoy.
 *
 * @param {object} [opciones]
 * @param {object} [opciones.estado] dónde se guarda el calentamiento (db.antiban)
 * @param {object} [opciones.ajustes] resultado de `ajustesDeRitmo()`
 */
/** Lo mínimo que se duerme entre vueltas de la cola (para no girar en vacío). */
const MINIMO_ESPERA_TAREA = 50;

export function crearLimitador({ estado, ajustes } = {}) {
  const cfg = { ...ajustesDeRitmo(), ...(ajustes || {}) };
  const hoy = () => new Date().toISOString().slice(0, 10);

  // El estado vive en la base: reiniciar el bot no reinicia el calentamiento.
  const guardado = estado || {};
  guardado.inicio ||= hoy();
  guardado.ultimoDia ||= hoy();
  guardado.msgsHoy = Number(guardado.msgsHoy) || 0;
  guardado.total = Number(guardado.total) || 0;

  // El perfil que manda: el guardado en la base (cambiado con `.warmup`) y, si
  // no hay, el del entorno. Así un cambio en caliente sobrevive al reinicio.
  const perfil = () => (PERFILES.includes(guardado.perfil) ? guardado.perfil : cfg.perfil);

  /** Días de rampa que toca hoy. Veterano es rampa cero, sin tocar el entorno. */
  const diasDeRampa = () => (perfil() === "veterano" ? 0 : cfg.diasCalentamiento);

  function revisarDia() {
    const dia = hoy();
    if (guardado.ultimoDia !== dia) {
      guardado.msgsHoy = 0;
      guardado.ultimoDia = dia;
    }
  }

  /** Día del calentamiento (1 = el primero) y tope que toca hoy. */
  function topeDeHoy() {
    if (!cfg.activo) return { dia: 1, tope: Infinity, terminado: true };
    const inicio = new Date(`${guardado.inicio}T00:00:00Z`).getTime();
    const dias = Math.max(0, Math.floor((Date.now() - inicio) / 86_400_000));
    const dia = dias + 1;
    const rampa = diasDeRampa();
    if (dias >= rampa) return { dia, tope: cfg.maxMsgsDia, terminado: true };
    const avance = rampa ? dias / rampa : 1;
    const tope = Math.round(cfg.inicioMsgsDia + (cfg.maxMsgsDia - cfg.inicioMsgsDia) * avance);
    return { dia, tope, terminado: false };
  }

  /** Milisegundos a esperar antes de este envío. */
  function demora({ urgente = false, largo = 0, nuevo = false } = {}) {
    revisarDia();
    if (!cfg.activo) return 0;
    if (urgente) return cfg.minimoMs;

    let ms = cfg.baseMs + gaussiana(0, cfg.baseMs * cfg.desviacion);
    if (largo > 10) ms += Math.min(largo * cfg.msPorLetra, 2000);
    if (nuevo) ms *= cfg.penalizacionNuevo;
    // De madrugada una persona tarda más en contestar; el multiplicador es
    // suave (curva, no escalón) para que no se note el cambio de golpe.
    if (cfg.circadiano) ms *= curvaCircadiana(Date.now()).factor;
    return Math.round(Math.max(cfg.minimoMs, Math.min(cfg.maximoMs, ms)));
  }

  /** ¿Queda cuota hoy? */
  function puedeEnviar() {
    revisarDia();
    return guardado.msgsHoy < topeDeHoy().tope;
  }

  function anotarEnvio() {
    revisarDia();
    guardado.msgsHoy += 1;
    guardado.total += 1;
  }

  function resumen() {
    revisarDia();
    const { dia, tope, terminado } = topeDeHoy();
    return {
      activo: cfg.activo,
      perfil: perfil(),
      dia,
      tope,
      msgsHoy: guardado.msgsHoy,
      total: guardado.total,
      terminado,
      alcanzado: guardado.msgsHoy >= tope,
    };
  }

  /**
   * Cambia el perfil en caliente. Devuelve `{ antes, ahora }` o `null` si el
   * nombre no existe (mejor no cambiar nada que cambiarlo a cualquier cosa).
   */
  function cambiarPerfil(nombre) {
    const pedido = String(nombre || "").toLowerCase().trim();
    if (!PERFILES.includes(pedido)) return null;
    const antes = perfil();
    guardado.perfil = pedido;
    return { antes, ahora: pedido };
  }

  return { demora, puedeEnviar, anotarEnvio, resumen, cambiarPerfil, ajustes: cfg, estado: guardado };
}

/**
 * La salud: cuenta desconexiones, errores y envíos fallidos de la última hora y
 * los convierte en un «riesgo» de 0 a 100.
 *
 * Los pesos son los de Shin-MD (10 por desconexión hasta 30, 5 por error hasta
 * 30, tasa de fallos hasta 30 y 10 más si hubo un 403). No están medidos contra
 * los servidores de WhatsApp —nadie puede medirlo desde fuera—; sirven como
 * semáforo, no como sentencia.
 */
export function crearSalud({ ventanaMs = 3_600_000, maximo = 2000 } = {}) {
  const eventos = [];

  function limpiar() {
    const corte = Date.now() - ventanaMs;
    while (eventos.length && eventos[0].ts < corte) eventos.shift();
  }

  function anotar(tipo, datos) {
    limpiar();
    eventos.push({ ts: Date.now(), tipo, datos });
    if (eventos.length > maximo) eventos.shift();
  }

  function codigoDe(err) {
    return err?.output?.statusCode ?? err?.statusCode ?? err?.code ?? (err?.message || "desconocido");
  }

  function riesgo() {
    limpiar();
    const desconexiones = eventos.filter((e) => e.tipo === "desconexion").length;
    const errores = eventos.filter((e) => e.tipo === "error").length;
    const fallidos = eventos.filter((e) => e.tipo === "envio_fallido").length;
    const enviados = eventos.filter((e) => e.tipo === "envio").length;

    let puntos = 0;
    puntos += Math.min(30, desconexiones * 10);
    puntos += Math.min(30, errores * 5);
    if (enviados > 0) puntos += Math.min(30, (fallidos / enviados) * 100 * 0.5);
    if (eventos.some((e) => e.tipo === "error" && Number(e.datos?.codigo) === 403)) puntos += 10;

    return Math.round(Math.min(100, Math.max(0, puntos)));
  }

  function estado() {
    const puntos = riesgo();
    return {
      riesgo: puntos,
      nivel: puntos >= 80 ? "crítico" : puntos >= 50 ? "alto" : puntos >= 20 ? "moderado" : "normal",
      eventos: eventos.length,
    };
  }

  return {
    anotarEnvio: () => anotar("envio"),
    anotarDesconexion: () => anotar("desconexion"),
    anotarError: (err) => anotar("error", { codigo: codigoDe(err), mensaje: err?.message }),
    anotarEnvioFallido: (err) => anotar("envio_fallido", { codigo: codigoDe(err), mensaje: err?.message }),
    riesgo,
    estado,
    eventos,
  };
}

/**
 * La cola: un solo carril para todos los envíos.
 *
 * @param {object} opciones
 * @param {object} opciones.limitador de `crearLimitador`
 * @param {object} [opciones.salud]     de `crearSalud`
 * @param {object} [opciones.ritmo]     de `crearRitmo` (conversaciones y hora)
 * @param {function} [opciones.registro] dónde escribir los avisos (console por defecto)
 * @param {number} [opciones.plazoMs]   cuánto se espera una respuesta (2 min)
 * @param {number} [opciones.esperaConexionMs] cuánto se espera a que vuelva (5 min)
 * @param {number} [opciones.esperaTopeMs] cuánto se duerme con el tope alcanzado (60 s)
 */
export function crearCola({
  limitador,
  salud,
  ritmo,
  registro = console,
  plazoMs = 120_000,
  esperaConexionMs = 300_000,
  esperaTopeMs = 60_000,
} = {}) {
  const tareas = [];
  const motivosDePausa = new Set();
  let trabajando = false;
  let prioridad = 0;
  let inciertos = 0;
  let ultimoIncierto = 0;
  let avisadoTope = false;
  let avisadoRitmo = false;

  const pausada = () => motivosDePausa.size > 0;

  function avisarTope() {
    if (avisadoTope) return;
    avisadoTope = true;
    const r = limitador?.resumen?.();
    registro.warn?.(
      `🛡️ Tope diario alcanzado${r ? ` (${r.msgsHoy}/${r.tope} hoy · día ${r.dia})` : ""}: ` +
        `los envíos normales esperan. Ajusta WARMUP_START_MSGS / WARMUP_MAX_MSGS o ANTIBAN=off, y míralo con .warmup`
    );
  }

  function avisarRitmo(motivo) {
    if (avisadoRitmo) return;
    avisadoRitmo = true;
    const que =
      motivo === "chats-nuevos"
        ? "ya se abrieron todas las conversaciones nuevas de hoy"
        : motivo === "madrugada"
          ? "es de madrugada y ese chat no ha escrito"
          : motivo === "por-hora"
            ? "se llegó al tope de mensajes por hora"
            : "se llegó al tope de mensajes seguidos en ese chat";
    registro.warn?.(
      `🌙 Ritmo: ${que}. El envío espera (míralo con .warmup). Contestar a quien ya escribió no se frena.`
    );
  }

  function dormir(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function esperarConexion() {
    const fin = Date.now() + esperaConexionMs;
    while (pausada() && Date.now() < fin) await dormir(250);
    return !pausada();
  }

  function encolar(fn, opciones = {}) {
    return new Promise((resolver, rechazar) => {
      tareas.push({
        fn,
        urgente: Boolean(opciones.isPriority || prioridad > 0),
        cuenta: opciones.countsForQuota !== false,
        largo: Number(opciones.messageLength) || 0,
        destino: typeof opciones.destino === "string" ? opciones.destino : "",
        resolver,
        rechazar,
      });
      if (!trabajando) procesar();
    });
  }

  async function procesar() {
    if (trabajando || pausada()) return;
    trabajando = true;

    while (tareas.length) {
      if (pausada()) {
        trabajando = false;
        return;
      }

      if (limitador && limitador.puedeEnviar()) avisadoTope = false;
      if (ritmo && ritmo.permite("", {}).ok) avisadoRitmo = false;

      // Quién puede salir ahora. Pasan siempre las urgentes (`.menu`, `.ping`)
      // y las que no gastan cuota (reacciones, borrados, ediciones); el resto
      // espera al tope diario o al presupuesto de conversaciones.
      const cabe = (t) => {
        if (t.urgente || !t.cuenta) return true;
        if (limitador && !limitador.puedeEnviar()) return false;
        if (ritmo && !ritmo.permite(t.destino, { urgente: false }).ok) return false;
        return true;
      };

      const i = tareas.findIndex(cabe);
      if (i === -1) {
        if (limitador && !limitador.puedeEnviar()) {
          avisarTope();
        } else {
          avisarRitmo(ritmo?.permite(tareas[0]?.destino || "", {}).motivo);
        }
        // Nunca menos de 50 ms: si no, con un tope de prueba la cola se
        // quedaría girando en vacío gastando CPU sin enviar nada.
        await dormir(Math.max(MINIMO_ESPERA_TAREA, esperaTopeMs));
        continue;
      }
      const tarea = tareas.splice(i, 1)[0];

      const espera = limitador ? limitador.demora({ urgente: tarea.urgente, largo: tarea.largo }) : 0;
      if (espera > 0) await dormir(espera);

      try {
        const resultado = await conPlazo(tarea.fn(), plazoMs, "envío");
        if (limitador && tarea.cuenta) limitador.anotarEnvio();
        if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
        salud?.anotarEnvio();
        tarea.resolver(resultado);
      } catch (err) {
        salud?.anotarEnvioFallido(err);

        // ── Sin respuesta: NO se repite ────────────────────────────────────
        // El envío huérfano puede haber llegado. Repetirlo manda el mensaje
        // dos veces, que es justo lo que más se reporta como spam.
        if (err?.code === CODIGO_INCIERTO) {
          inciertos += 1;
          ultimoIncierto = Date.now();
          if (limitador && tarea.cuenta) limitador.anotarEnvio();
          if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
        if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
          registro.warn?.(
            `⚠️ Envío sin respuesta tras ${plazoMs} ms: no lo repito para no duplicarlo (van ${inciertos} en esta sesión).`
          );
          tarea.rechazar(err);
          continue;
        }

        // ── Conexión caída: el mensaje espera ──────────────────────────────
        // «Connection Closed» lo lanza Baileys al escribir sobre un socket ya
        // cerrado: el fotograma no salió, así que reintentar no duplica.
        if (esFalloDeConexion(err)) {
          registro.warn?.("🔌 Conexión caída: el mensaje queda en cola y sale al reconectar.");
          const volvio = await esperarConexion();
          if (!volvio) {
            registro.warn?.(`⚠️ La conexión no volvió en ${Math.round(esperaConexionMs / 60000)} min: ese mensaje se pierde.`);
            tarea.rechazar(err);
            continue;
          }
          try {
            const resultado = await conPlazo(tarea.fn(), plazoMs, "envío tras reconectar");
            if (limitador && tarea.cuenta) limitador.anotarEnvio();
          if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
        if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
            salud?.anotarEnvio();
            tarea.resolver(resultado);
          } catch (err2) {
            salud?.anotarEnvioFallido(err2);
            tarea.rechazar(err2);
          }
          continue;
        }

        // ── Fallo seguro: un reintento, con su espera ──────────────────────
        registro.error?.(`❌ Falló un envío: ${err?.message || err}`);
        try {
          const reintentoMs = limitador ? Math.max(2000, limitador.demora({ largo: tarea.largo })) : 3000;
          await dormir(reintentoMs);
          const resultado = await conPlazo(tarea.fn(), plazoMs, "reintento");
          if (limitador && tarea.cuenta) limitador.anotarEnvio();
          if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
        if (ritmo && tarea.cuenta) ritmo.anotarSalida(tarea.destino);
          salud?.anotarEnvio();
          tarea.resolver(resultado);
        } catch (err2) {
          if (err2?.code === CODIGO_INCIERTO) {
            inciertos += 1;
            ultimoIncierto = Date.now();
            registro.warn?.("⚠️ El reintento también quedó sin respuesta; no hay un tercer envío.");
          } else {
            salud?.anotarEnvioFallido(err2);
          }
          tarea.rechazar(err2);
        }
      }
    }

    trabajando = false;
  }

  /** Corre `fn` con prioridad: lo que se envíe dentro sale con la espera mínima. */
  async function conPrioridad(fn) {
    prioridad += 1;
    try {
      return await fn();
    } finally {
      prioridad = Math.max(0, prioridad - 1);
    }
  }

  return {
    encolar,
    conPrioridad,
    pausar: (motivo = "manual") => {
      motivosDePausa.add(motivo);
    },
    reanudar: (motivo = "manual") => {
      motivosDePausa.delete(motivo);
      if (!pausada() && !trabajando) procesar();
    },
    motivos: () => [...motivosDePausa],
    pausada,
    largo: () => tareas.length,
    limpiar: () => {
      tareas.length = 0;
    },
    estado: () => ({ enEspera: tareas.length, pausada: pausada(), motivos: [...motivosDePausa], inciertos, ultimoIncierto }),
  };
}

/**
 * Manda por la cola todo lo que salga de este socket.
 *
 * Se parchea `sendMessage` y `relayMessage` una sola vez: los plugins siguen
 * llamando a `sock.sendMessage` como siempre y no hay que tocarlos. Las
 * reacciones, borrados y ediciones no gastan cuota y salen con prioridad (si no,
 * con el tope alcanzado el bot no podría ni quitar un mensaje).
 */
export function envolverSocket(sock, { cola, ritmo }) {
  if (!sock || sock.__colaLevi) return sock;

  const enviarOriginal = sock.sendMessage.bind(sock);
  const relayOriginal = sock.relayMessage.bind(sock);

  /**
   * El «escribiendo…» de antes de mandar.
   *
   * Es la señal más barata que hay y la que WhatsApp nombra en su propio
   * documento sobre spam: una cuenta que nunca enciende el tecleo es señal de
   * abuso. Dura lo que tardaría una persona en escribir ese texto, con un tope:
   * un humano también pega y manda.
   */
  async function teclear(jid, largo) {
    if (!ritmo || !ritmo.ajustes.presencia) return;
    if (typeof sock.sendPresenceUpdate !== "function") return;
    // Los canales y los estados no tienen «escribiendo».
    if (typeof jid === "string" && (jid.endsWith("@newsletter") || jid.endsWith("@broadcast"))) return;
    if (!largo) return;
    try {
      await sock.sendPresenceUpdate("composing", jid);
      await dormir(planDeEscritura("x".repeat(largo)).ms);
    } catch {
      // Si el servidor no lo admite, el mensaje sale igual: el tecleo es un
      // adorno del ritmo, no un requisito para mandar.
    }
  }

  async function soltar(jid) {
    if (!ritmo || !ritmo.ajustes.presencia) return;
    if (typeof sock.sendPresenceUpdate !== "function") return;
    try {
      await sock.sendPresenceUpdate("paused", jid);
    } catch {
      /* igual que arriba */
    }
  }

  sock.sendMessage = (jid, contenido, opciones) => {
    const cuerpo = contenido && typeof contenido === "object" ? contenido : {};
    const liviano = Boolean(cuerpo.react || cuerpo.delete || cuerpo.edit);
    const largo = typeof cuerpo.text === "string" ? cuerpo.text.length : 0;

    return cola.encolar(
      async () => {
        if (!liviano) await teclear(jid, largo);
        try {
          return await enviarOriginal(jid, contenido, opciones);
        } finally {
          if (!liviano) void soltar(jid);
        }
      },
      {
        isPriority: liviano,
        countsForQuota: !liviano,
        messageLength: largo,
        destino: jid,
      }
    );
  };

  sock.relayMessage = (jid, mensaje, opciones) => {
    const largo = JSON.stringify(mensaje ?? {}).length;
    return cola.encolar(
      async () => {
        await teclear(jid, Math.min(largo, 1200));
        try {
          return await relayOriginal(jid, mensaje, opciones);
        } finally {
          void soltar(jid);
        }
      },
      { messageLength: largo, destino: jid }
    );
  };

  Object.defineProperty(sock, "__colaLevi", { value: true, enumerable: false });
  return sock;
}

/**
 * El vigilante: mira el riesgo cada 10 s y actúa.
 *
 *   riesgo ≥ 80 → pausa la cola (deja de mandar hasta que baje)
 *   riesgo ≥ 95 → cierra el websocket para que Baileys reconecte
 *   sin señales de vida en 5 min con el socket abierto → lo mismo
 *   tres reconnects seguidos sin alivio → para y avisa (no reinicia solo)
 *
 * Lo último es importante: un bucle de reconexiones es peor que estar caído.
 */
export function crearVigilante({
  cola,
  salud,
  obtenerSock,
  registro = console,
  intervaloMs = 10_000,
  sinSenalMs = 300_000,
  riesgoAlto = 80,
  riesgoCritico = 95,
  maxIntentos = 3,
  enfriamientoMs = 120_000,
} = {}) {
  let reloj = null;
  let ultimaSenal = Date.now();
  let pausadoPorRiesgo = false;
  let intentos = 0;
  let ultimoIntento = 0;
  let revisando = false;
  let ultimoRiesgo = 0;

  const socketAbierto = (sock) => Boolean(sock && (sock.ws?.ready === true || sock.ws?.readyState === 1));

  function latido() {
    ultimaSenal = Date.now();
  }

  function reconectar(motivo) {
    const sock = obtenerSock?.();
    if (!socketAbierto(sock)) return;
    if (Date.now() - ultimoIntento < enfriamientoMs) return;
    intentos += 1;
    ultimoIntento = Date.now();
    if (intentos > maxIntentos) {
      registro.error?.(
        `🛑 Vigilante: ${maxIntentos} reconexiones forzadas sin alivio. Riesgo de bloqueo; revisa sesión y red (no reinicio solo).`
      );
      intentos = 0;
      return;
    }
    registro.warn?.(`🔄 Vigilante: reconectando #${intentos} (${motivo})`);
    try {
      sock.ws.close();
    } catch (err) {
      registro.error?.(`Vigilante: ws.close() falló: ${err.message}`);
    }
  }

  function revisar() {
    if (revisando) return;
    revisando = true;
    try {
      if (!salud || !cola) return;
      const { riesgo } = salud.estado();
      ultimoRiesgo = riesgo;

      if (riesgo >= riesgoAlto && !pausadoPorRiesgo) {
        pausadoPorRiesgo = true;
        cola.pausar("riesgo");
        registro.warn?.(`⚠️ Vigilante: riesgo ${riesgo} — envíos en pausa.`);
      } else if (pausadoPorRiesgo && riesgo < riesgoAlto) {
        pausadoPorRiesgo = false;
        cola.reanudar("riesgo");
        registro.log?.(`✅ Vigilante: riesgo ${riesgo} — envíos reanudados.`);
      }

      const quieto = Date.now() - ultimaSenal;
      if (quieto > sinSenalMs) {
        const sock = obtenerSock?.();
        if (socketAbierto(sock)) reconectar(`sin actividad ${Math.round(quieto / 60000)} min`);
        else registro.warn?.(`Vigilante: sin conexión abierta y ${Math.round(quieto / 60000)} min de silencio.`);
      }

      if (riesgo >= riesgoCritico) reconectar(`riesgo crítico ${riesgo}`);
      if (riesgo < riesgoAlto && intentos > 0) intentos = 0;
    } catch (err) {
      registro.error?.(`Vigilante: ${err.message}`);
    } finally {
      revisando = false;
    }
  }

  function iniciar() {
    if (reloj) return;
    reloj = setInterval(revisar, intervaloMs);
    reloj.unref?.();
  }

  function parar() {
    if (reloj) clearInterval(reloj);
    reloj = null;
  }

  return {
    iniciar,
    parar,
    revisar,
    latido,
    estado: () => ({ riesgo: ultimoRiesgo, pausadoPorRiesgo, intentos }),
  };
}

export default { crearLimitador, crearCola, crearSalud, crearVigilante, envolverSocket };
