/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/ritmo.js — el bot se comporta como una persona, no como una tubería.
 *
 * Tres señales, y solo tres, porque son las que de verdad se ven desde fuera:
 *
 *   1. CONVERSACIONES NUEVAS. Lo que se cuenta no son los mensajes, son las
 *      personas con las que *abres* conversación. Contestar cien veces a quien
 *      te escribió no es lo mismo que escribirle a cien desconocidos.
 *   2. RELOJ. Una cuenta que contesta igual a las 3 de la mañana que a las 5 de
 *      la tarde es una cuenta despierta 24 h. La espera crece de noche, y de
 *      madrugada no se abre conversación nueva.
 *   3. TECLEO. WhatsApp lo dice en su propio documento sobre spam: si una
 *      cuenta manda mensajes sin encender nunca el «escribiendo», eso es señal
 *      de abuso. Es la señal más barata de todas: no cuesta cuota ni CPU.
 *
 * Lo que este archivo NO hace: garantizar nada. Baja el parecido con un robot;
 * no convierte una cuenta en intocable.
 */

/** Número con forma de campana (Box-Muller). */
function campana(media, desviacion) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return media + desviacion * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const acotar = (n, min, max) => Math.min(max, Math.max(min, n));
const hoy = (cuando) => new Date(cuando).toISOString().slice(0, 10);

function numeroDeEntorno(nombre, porDefecto) {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo === "") return porDefecto;
  const n = Number(crudo);
  return Number.isFinite(n) && n >= 0 ? n : porDefecto;
}

const apagado = () => String(process.env.RITMO || "").toLowerCase() === "off";

/**
 * Niveles de caudal. La cuenta que hay detrás:
 *
 *   mensajes por día ≈ MENSAJES_HORA × horas de actividad
 *
 * Con `normal` (30/h) y 14 horas salen ~420 al día: por mucho que se suba el
 * tope diario, el cuello de botella es la hora. Para pasar de 2 000 hace falta
 * `alto`, y eso sube el promedio por encima de las 60 que las guías marcan como
 * zona de peligro.
 *
 * Lo que NO cambia con el nivel: `NUEVOS_DIA`. Abrir conversación con
 * desconocidos es lo que se puntúa; el caudal alto es para contestar.
 */
export const NIVELES = {
  normal: { mensajesHora: 30, porChatHora: 15 },
  alto: { mensajesHora: 80, porChatHora: 25 },
  maximo: { mensajesHora: 200, porChatHora: 40 },
};

export function nivelPedido() {
  const crudo = String(process.env.RITMO_NIVEL || "normal").toLowerCase().trim();
  return NIVELES[crudo] ? crudo : "normal";
}

/** Ajustes del ritmo humano. Todo se puede cambiar por entorno. */
export function ajustesDeRitmo() {
  return {
    activo: !apagado(),
    // Chats nuevos por día. La comunidad de bots coincide en que por debajo de
    // 20 es la zona segura; por encima de 50, zona roja.
    nuevosDia: numeroDeEntorno("NUEVOS_DIA", 20),
    // Rampeo solo de los chats nuevos: un número recién nacido no abre
    // conversaciones, contesta.
    nuevosPrimerDia: numeroDeEntorno("NUEVOS_DIA_1", 5),
    nuevosDiaTres: numeroDeEntorno("NUEVOS_DIA_3", 10),
    diasDeRampa: numeroDeEntorno("NUEVOS_RAMPA_DIAS", 7),
    // Ritmo: por debajo de 30 mensajes/hora es la zona tranquila; más de 60 es
    // la que las guías marcan como peligrosa. `RITMO_NIVEL=alto|maximo` sube el
    // caudal para quien contesta mucho, a sabiendas de lo que implica.
    mensajesHora: numeroDeEntorno("MENSAJES_HORA", NIVELES[nivelPedido()].mensajesHora),
    porChatHora: numeroDeEntorno("POR_CHAT_HORA", NIVELES[nivelPedido()].porChatHora),
    // Ráfaga: una persona manda 3-4 mensajes seguidos y luego se calla.
    rafaga: numeroDeEntorno("RAFAGA", 4),
    // Un grupo pesa más: lo que se manda a un grupo lo ven muchos de golpe.
    factorGrupo: Number(process.env.FACTOR_GRUPO ?? 2),
    // Cuánto dura la «calidez» de un chat: si nos escribió hace menos de esto,
    // nuestra respuesta es una respuesta, no un acercamiento.
    calienteMin: numeroDeEntorno("CALIENTE_MIN", 60),
    // Madrugada: ni conversación nueva ni prisa.
    silencioDesde: numeroDeEntorno("SILENCIO_DESDE", 2),
    silencioHasta: numeroDeEntorno("SILENCIO_HASTA", 6),
    // Tecleo: 45 palabras por minuto es una persona normal escribiendo.
    tecleoWpm: numeroDeEntorno("TECLEO_WPM", 45),
    tecleoMinMs: numeroDeEntorno("TECLEO_MIN_MS", 700),
    tecleoMaxMs: numeroDeEntorno("TECLEO_MAX_MS", 4000),
    presencia: String(process.env.PRESENCIA || "").toLowerCase() !== "off",
  };
}

/**
 * Qué tan «de noche» es una hora: 1 a las 3 de la mañana, 0 de 8 a 22.
 * Curva suave a propósito: un escalón se nota tanto como un robot.
 *
 * @param {number|Date} cuando hora (0-23) o momento
 * @returns {{hora:number, factor:number, madrugada:boolean}}
 */
export function curvaCircadiana(cuando = new Date(), ajustes = ajustesDeRitmo()) {
  // Un número pequeño es una hora (0-23); uno grande es un instante. Sin esta
  // distinción, `Date.now()` se leería como «hora 1794279600» y la noche nunca
  // llegaría (lo cazó la prueba de las 3 de la mañana).
  const hora =
    typeof cuando === "number" && cuando >= 0 && cuando < 24
      ? cuando
      : new Date(cuando).getHours();
  const lejos = Math.min(1, Math.abs(hora - 3) / 5);
  const noche = 0.5 * (1 + Math.cos(Math.PI * lejos)); // 1 en el centro de la noche
  return {
    hora,
    factor: Number((0.8 + 1.7 * noche).toFixed(3)),
    madrugada: hora >= ajustes.silencioDesde && hora < ajustes.silencioHasta,
  };
}

/**
 * Cuánto tardaría una persona en escribir ese texto.
 *
 * Se acota por arriba a propósito: un humano también pega y manda. Nadie se
 * queda 50 segundos viendo «escribiendo…» para un menú.
 *
 * @param {string} texto
 * @returns {{ms:number, segundos:number}}
 */
export function planDeEscritura(texto = "", ajustes = ajustesDeRitmo()) {
  const largo = String(texto || "").length;
  // 45 palabras por minuto ≈ 3,75 letras por segundo, con días buenos y malos.
  const porSegundo = Math.max(1, campana(ajustes.tecleoWpm * 5 / 60, 1.2));
  const segundos = acotar(largo / porSegundo, ajustes.tecleoMinMs / 1000, ajustes.tecleoMaxMs / 1000);
  return { ms: Math.round(segundos * 1000), segundos: Number(segundos.toFixed(1)) };
}

/**
 * El presupuesto de conversaciones, con memoria en la base.
 *
 * @param {object} [opciones]
 * @param {object} [opciones.estado] dónde vive (db.ritmo): sobrevive al reinicio
 * @param {object} [opciones.ajustes]
 */
export function crearRitmo({ estado, ajustes } = {}) {
  const cfg = { ...ajustesDeRitmo(), ...(ajustes || {}) };
  const s = estado || {};
  s.ultimoDia ||= hoy(Date.now());
  s.salidasHoy = Number(s.salidasHoy) || 0;
  s.salidas ||= []; // instantes de los últimos envíos, para el tope por hora
  s.chatsNuevos ||= {}; // jid → día en que se le abrió conversación
  s.entrantes ||= {}; // jid → instante del último mensaje que nos mandó
  s.porChat ||= {}; // jid → instantes de nuestras salidas a ese chat
  // Ráfaga: envíos seguidos sin esperar, con su propio techo.
  let rafagaActual = 0;
  let ultimoEnvio = 0;
  s.aperturas ||= []; // instantes de aperturas de conversación

  function revisarDia(cuando = Date.now()) {
    const dia = hoy(cuando);
    if (s.ultimoDia !== dia) {
      s.ultimoDia = dia;
      s.salidasHoy = 0;
    }
  }

  /** Cuántos chats nuevos permite abrir hoy. Sube con los días de vida. */
  function cupoNuevos(ahora = Date.now()) {
    if (!cfg.diasDeRampa) return cfg.nuevosDia;
    const dias = Math.max(0, Math.floor((ahora - new Date(`${s.inicio || s.ultimoDia}T00:00:00Z`).getTime()) / 86_400_000));
    if (dias < 3) return cfg.nuevosPrimerDia;
    if (dias < cfg.diasDeRampa) return cfg.nuevosDiaTres;
    return cfg.nuevosDia;
  }

  function abiertosHoy(ahora = Date.now()) {
    const dia = hoy(ahora);
    return Object.values(s.chatsNuevos).filter((d) => d === dia).length;
  }

  /** ¿Nos escribió hace poco? Entonces contestarle no es acercarse. */
  function caliente(jid, ahora = Date.now()) {
    const ultimo = Number(s.entrantes[jid]) || 0;
    return ultimo > 0 && ahora - ultimo <= cfg.calienteMin * 60_000;
  }

  function salidasUltimaHora(ahora = Date.now()) {
    const corte = ahora - 3_600_000;
    s.salidas = s.salidas.filter((t) => t > corte);
    return s.salidas.length;
  }

  function salidasDelChat(jid, ahora = Date.now()) {
    const corte = ahora - 3_600_000;
    const lista = (s.porChat[jid] || []).filter((t) => t > corte);
    s.porChat[jid] = lista;
    return lista.length;
  }

  /**
   * ¿Se puede mandar esto ahora?
   *
   * @param {string} jid
   * @param {object} [op]
   * @param {boolean} [op.urgente] `.menu`, `.ping`: nunca se frenan
   * @param {number} [op.ahora]
   * @returns {{ok:boolean, motivo:string|null, detalle?:object}}
   */
  function permite(jid, { urgente = false, ahora = Date.now() } = {}) {
    if (!cfg.activo || urgente) return { ok: true, motivo: null };
    revisarDia(ahora);

    const reloj = curvaCircadiana(ahora, cfg);
    const esCaliente = caliente(jid, ahora);

    // Conversación nueva: es lo único que de verdad gasta reputación.
    if (!esCaliente) {
      if (reloj.madrugada) return { ok: false, motivo: "madrugada", detalle: reloj };
      const cupo = cupoNuevos(ahora);
      if (abiertosHoy(ahora) >= cupo) return { ok: false, motivo: "chats-nuevos", detalle: { cupo } };
    }

    if (salidasUltimaHora(ahora) >= cfg.mensajesHora) {
      return { ok: false, motivo: "por-hora", detalle: { limite: cfg.mensajesHora } };
    }
    if (salidasDelChat(jid, ahora) >= cfg.porChatHora) {
      return { ok: false, motivo: "por-chat", detalle: { limite: cfg.porChatHora } };
    }
    return { ok: true, motivo: null };
  }

  /** Cuántas salidas a grupos hubo en la última hora (para pesar el cupo). */
  function salidasAGrupos(ahora) {
    const corte = ahora - 3_600_000;
    let n = 0;
    for (const [jid, lista] of Object.entries(s.porChat)) {
      if (!String(jid).endsWith("@g.us")) continue;
      n += (lista || []).filter((t) => t > corte).length;
    }
    return n;
  }

  /** Apunta un mensaje que nos llegó: enciende la calidez de ese chat. */
  function anotarEntrante(jid, cuando = Date.now()) {
    if (!jid) return;
    s.entrantes[jid] = cuando;
    s.inicio ||= hoy(cuando);
    // La memoria no crece sin freno: se queda con los 500 chats más recientes.
    const entradas = Object.entries(s.entrantes);
    if (entradas.length > 500) {
      entradas.sort((a, b) => b[1] - a[1]);
      s.entrantes = Object.fromEntries(entradas.slice(0, 500));
    }
  }

  /** Apunta un envío. Si el chat era frío, además cuenta como conversación nueva. */
  function anotarSalida(jid, { ahora = Date.now() } = {}) {
    if (!jid) return;
    revisarDia(ahora);
    const fueCaliente = caliente(jid, ahora);
    s.salidas.push(ahora);
    s.salidasHoy += 1;
    s.porChat[jid] = [...(s.porChat[jid] || []), ahora];
    // La ráfaga se corta si pasa medio minuto: entonces ya es otra conversación.
    rafagaActual = ahora - ultimoEnvio < 30_000 ? rafagaActual + 1 : 1;
    ultimoEnvio = ahora;
    s.inicio ||= hoy(ahora);
    if (!fueCaliente && !s.chatsNuevos[jid]) {
      s.chatsNuevos[jid] = hoy(ahora);
      s.aperturas.push(ahora);
    }
    // Tope de memoria para las listas largas.
    if (s.salidas.length > 1000) s.salidas = s.salidas.slice(-500);
    if (s.aperturas.length > 1000) s.aperturas = s.aperturas.slice(-500);
  }

  /** Multiplicador de espera por la hora que es. */
  function factorHorario(ahora = Date.now()) {
    if (!cfg.activo) return 1;
    return curvaCircadiana(ahora, cfg).factor;
  }

  function resumen(ahora = Date.now()) {
    revisarDia(ahora);
    const reloj = curvaCircadiana(ahora, cfg);
    return {
      activo: cfg.activo,
      presencia: cfg.presencia,
      hora: reloj.hora,
      madrugada: reloj.madrugada,
      nuevosHoy: abiertosHoy(ahora),
      cupoNuevos: cupoNuevos(ahora),
      salidasHoy: s.salidasHoy,
      porHora: salidasUltimaHora(ahora),
      limiteHora: cfg.mensajesHora,
      rafaga: cfg.rafaga,
    };
  }

  return { permite, anotarEntrante, anotarSalida, caliente, factorHorario, resumen, ajustes: cfg, estado: s };
}

export default { crearRitmo, curvaCircadiana, planDeEscritura, ajustesDeRitmo };
