/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * boot/subbots.js — el ciclo de vida de los sub-bots, en un solo sitio.
 *
 * Estaba dentro de `index.js` y compartía variables con la conexión principal.
 * Al sacarlo se arreglan tres cosas que allí no tenían dónde apoyarse:
 *
 *   1. REINTENTOS CON TECHO. Con el código 515 (`restartRequired`) el manejador
 *      se llamaba a sí mismo sin espera y sin límite. Si WhatsApp insistía con
 *      el 515, el bucle creaba un socket tras otro a toda velocidad: memoria
 *      arriba, y cada intento es una cuenta hablando raro, que es justo lo que
 *      mira el anti-ban. Ahora hay tope de intentos y espera creciente.
 *   2. REENTRADA. Un cierre podía disparar dos arranques a la vez y dejar dos
 *      sockets vivos para el mismo número, con los dos atendiendo el mismo
 *      grupo. Se marca el número como «en curso» mientras se levanta.
 *   3. EL PADRE CAMBIA. Al reconectar, el bot principal estrena socket; el
 *      sub-bot que guardó una referencia al viejo mandaba sus avisos al aire. Se
 *      pregunta por el padre en cada envío.
 *
 * Lo que NO cambia es la API que ven los plugins: `startSubbot`, `stopSubbot`,
 * `getActiveSubbots`, `restaurarSubbots`, `loadSubConfig` y `saveSubConfig`
 * siguen teniendo la misma firma, así que `.jadibot`, `.code`, `.stopbot`,
 * `.bots` y `.revivirsubs` no se tocan.
 */

import fs from "fs";
import pino from "pino";
import { Boom } from "@hapi/boom";

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from "../lib/baileys.js";
import {
  rutaSesion,
  leerConfig,
  guardarConfig,
  borrarSesion,
  sesionesParaRestaurar,
  migrarSesionVieja,
  numeroValido,
} from "../lib/subbots.js";
import { SUB_SESIONES, SUB_CONFIGS, asegurarCarpetas } from "../lib/rutas.js";
import { numeroDe } from "./router.js";

export const LIMITE_SUBBOTS = 10;

/** Techo de reconexiones seguidas y esperas. Sin esto el 515 gira solo. */
export const REINTENTOS = {
  maximo: 5,
  baseMs: 2_000,
  topeMs: 60_000,
  /** ms sin caídas tras los que el contador de intentos vuelve a cero. */
  estableMs: 5 * 60_000,
};

/** Espera del intento n-ésimo: 2 s, 4 s, 8 s, 16 s… con techo. */
export function esperaDeReintento(intento, ajustes) {
  // `|| {}` y no `= {}`: un `null` explícito se saltaría el valor por defecto.
  const { baseMs = REINTENTOS.baseMs, topeMs = REINTENTOS.topeMs } = ajustes || {};
  const n = Math.max(1, Number(intento) || 1);
  return Math.min(topeMs, baseMs * 2 ** (n - 1));
}

/**
 * Decide qué hacer tras un cierre con código 515 (`restartRequired`).
 *
 * Va aparte y es pura para poder medirla: el fallo original era una llamada
 * recursiva sin techo ni espera, o sea que un 515 persistente ponía al bot a
 * crear sockets sin parar. Aquí se devuelve «espera y reintenta» con espera
 * creciente, o «se acabó» cuando ya son demasiados seguidos.
 *
 * @param {number} intentoActual cuántas reconexiones lleva seguidas
 * @param {number} ultima        reloj de la última caída
 * @param {number} [ahora]
 * @param {object} [cfg]         mismos campos que REINTENTOS
 * @returns {{reintentar:boolean, esperaMs:number, motivo:string}}
 */
export function decideReintento(intentoActual, ultima, cuando, cfg) {
  const ajuste = cfg || REINTENTOS;
  const ahora = typeof cuando === "number" ? cuando : Date.now();
  const estable = Number(ajuste.estableMs ?? REINTENTOS.estableMs);
  const maximo = Number(ajuste.maximo ?? REINTENTOS.maximo);
  const llevados = Number(intentoActual) || 0;

  // Se reinicia el contador solo si hay una marca de tiempo y ya es vieja.
  // `ultima` en 0 o null significa «todavía no se agendó ningún reintento», que
  // no es lo mismo que «lleva rato estable»: es la primera caída.
  const estableDeVerdad = ultima && ahora - ultima > estable;
  const seguidos = estableDeVerdad ? 0 : llevados;
  const siguiente = seguidos + 1;

  if (siguiente > maximo) {
    return {
      reintentar: false,
      esperaMs: 0,
      motivo: `${maximo} reinicios seguidos sin conectar`,
    };
  }

  return {
    reintentar: true,
    esperaMs: esperaDeReintento(siguiente, ajuste),
    motivo: `intento ${siguiente}/${maximo}`,
  };
}

/**
 * @param {object} deps
 * @param {function} deps.obtenerPadre   () → socket principal vigente
 * @param {function} deps.obtenerRouter  (subSock) → manejador de mensajes
 * @param {Map}      [deps.events]       nombre de evento → plugins
 * @param {object}   [deps.config]
 * @param {number}   [deps.maximo]       cuántos sub-bots a la vez
 * @param {object}   [deps.reintentos]   ajustes del techo de reconexión
 * @param {function} [deps.registrar]    dónde apuntar los fallos
 */
export function crearGestorSubbots(deps) {
  const {
    obtenerPadre,
    obtenerRouter,
    events = new Map(),
    config = { prefix: ["."] },
    maximo = LIMITE_SUBBOTS,
    reintentos = REINTENTOS,
    registrar = (err) => console.error("❌ Sub-bots:", err?.stack || err),
    crearSocket = makeWASocket,
    armarAntiban = null,
    leerSesion = useMultiFileAuthState,
    prepararClaves = makeCacheableSignalKeyStore,
    obtenerVersion = fetchLatestBaileysVersion,
  } = deps;

  /** numero → socket vivo. */
  const activos = new Map();
  // riokuroxi-svg: también se rastrean sockets que aún están conectando.
  const sockets = new Map();
  const pendientes = new Map();
  /** numero → { intentos, ultima } para el techo de reconexión. */
  const intentos = new Map();
  /** numero → true mientras se está levantando, para no duplicar sockets. */
  const enCurso = new Set();
  let restaurado = false;

  const prefijo = () => config.prefix?.[0] || ".";

  function asegurarDirs() {
    try {
      asegurarCarpetas();
    } catch {
      if (!fs.existsSync(SUB_CONFIGS)) fs.mkdirSync(SUB_CONFIGS, { recursive: true });
      if (!fs.existsSync(SUB_SESIONES)) fs.mkdirSync(SUB_SESIONES, { recursive: true });
    }
  }

  function loadSubConfig(numero) {
    asegurarDirs();
    return leerConfig(numero);
  }

  function saveSubConfig(numero, cfg) {
    asegurarDirs();
    return guardarConfig(numero, cfg);
  }

  function getActiveSubbots() {
    return activos;
  }

  /** Aviso al dueño del sub-bot. Si el padre cambió o no puede, se apunta y sigue. */
  async function avisar(remoteJid, texto) {
    try {
      const padre = obtenerPadre?.();
      if (!padre) return null;
      return await padre.sendMessage(remoteJid, { text: texto });
    } catch (err) {
      console.error(`⚠️ No se pudo avisar a ${remoteJid}:`, err?.message || err);
      return null;
    }
  }

  function cuentaIntentos(numero) {
    const ahora = Date.now();
    const previo = intentos.get(numero);
    if (!previo || ahora - previo.ultima > reintentos.estableMs) {
      // Primera caída, o llevaba rato estable: el contador empieza en cero.
      // `ultima` NO se toca aquí: la pone `decideReintento` cuando de verdad se
      // agenda un reintento. Si se pusiera ahora, la comparación «¿lleva rato
      // estable?» saldría siempre falsa y el techo no se alcanzaría nunca.
      const fresco = { intentos: 0, ultima: 0 };
      intentos.set(numero, fresco);
      return fresco;
    }
    return previo;
  }

  function limpiarIntentos(numero) {
    intentos.delete(numero);
  }

  /**
   * Levanta un sub-bot. La firma es la que ya usaban los plugins.
   *
   * @param {object}  _padre     socket principal (se usa el vigente, no este)
   * @param {string}  senderJid  de quién es la cuenta que se vincula
   * @param {string}  remoteJid  a qué chat se le avisa
   * @param {function} reply     cómo contestarle a quien lo pidió
   * @param {"code"|"sesion"} method
   */
  async function startSubbot(_padre, senderJid, remoteJid, reply, method, creador = null, opciones = {}) {
    const phoneNumber = numeroDe(senderJid);
    const contestar = typeof reply === "function" ? reply : (t) => avisar(remoteJid, t);

    if (!numeroValido(phoneNumber)) {
      return contestar(
        `❌ *Número inválido:* \`${phoneNumber}\`\n\nParece un LID.\n👉 Usa: *${prefijo()}jadibot 5354386852*`
      );
    }

    if (sockets.size + enCurso.size >= maximo) {
      return contestar(`⚠️ Límite de subbots alcanzado (${maximo}).`);
    }

    if (sockets.has(phoneNumber)) {
      return contestar(`⚠️ Ya tienes un subbot activo (${phoneNumber}).`);
    }

    // Un cierre puede disparar dos arranques seguidos; el segundo se descarta.
    if (enCurso.has(phoneNumber)) {
      console.log(`⏳ Sub-bot ${phoneNumber} ya se está levantando.`);
      return null;
    }
    enCurso.add(phoneNumber);

    // Se apunta quién lo pidió la primera vez. Es lo que permite que `.serbot`
    // enseñe a cada uno lo suyo y a nadie lo ajeno.
    try {
      const cfg = loadSubConfig(phoneNumber);
      const dueno = numeroDe(creador || senderJid);
      const lista = Array.isArray(cfg.owners) ? cfg.owners.map((o) => numeroDe(o)) : [];
      if (dueno && !lista.includes(dueno)) saveSubConfig(phoneNumber, { ...cfg, owners: [...lista, dueno] });
    } catch (err) {
      registrar(err);
    }

    try {
      return await levantar(phoneNumber, senderJid, remoteJid, contestar, method, opciones);
    } catch (err) {
      registrar(err);
      await avisar(remoteJid, `❌ No se pudo levantar el sub-bot ${phoneNumber}: ${err?.message || err}`);
      return null;
    } finally {
      enCurso.delete(phoneNumber);
    }
  }

  async function levantar(phoneNumber, senderJid, remoteJid, contestar, method, opciones = {}) {
    migrarSesionVieja(phoneNumber);
    const sessionPath = rutaSesion(phoneNumber);
    if (!fs.existsSync(SUB_SESIONES)) fs.mkdirSync(SUB_SESIONES, { recursive: true });

    const { state, saveCreds } = await leerSesion(sessionPath);
    const { version } = await obtenerVersion();

    const subSock = crearSocket({
      version,
      auth: { creds: state.creds, keys: prepararClaves(state.keys, pino({ level: "silent" })) },
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 120_000,
      keepAliveIntervalMs: 25_000,
    });

    // El anti-ban se arma ANTES de conectar: así lo primero que salga de este
    // socket (el código de vinculación) ya pasa por la cola. Cada sub-bot es una
    // cuenta distinta y lleva su propio tope diario (ver prepararAntiban).
    let antiban = null;
    try {
      antiban = armarAntiban?.(subSock, phoneNumber) || null;
    } catch (err) {
      registrar(err);
    }

    sockets.set(phoneNumber, subSock);
    subSock.antiban = antiban;
    subSock.subconfig = loadSubConfig(phoneNumber);
    subSock.esSubbot = true;
    subSock.numeroSubbot = phoneNumber;
    subSock.ev.on("creds.update", saveCreds);

    let codigoPedido = false;
    let borrarAviso = null;

    subSock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update || {};

      try {
        // ── Código de vinculación ─────────────────────────────────────────
        if (
          method === "code" &&
          !subSock.authState?.creds?.registered &&
          !codigoPedido &&
          qr
        ) {
          codigoPedido = true;
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const code = await subSock.requestPairingCode(phoneNumber);
            if (typeof opciones.onPairingCode === "function") {
              await opciones.onPairingCode(code, phoneNumber);
            }

            const msg1 = await avisar(
              remoteJid,
              "> 𝘼𝙙𝙤-𝑩𝒐𝒕✰\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ Cσԃҽ\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n✧ No es recomendable usar tu cuenta principal."
            );
            await new Promise((r) => setTimeout(r, 800));
            const msg2 = await avisar(remoteJid, `\`\`\`\n${code}\n\`\`\``);

            // El código caduca: si sigue ahí, alguien lo puede usar después.
            if (borrarAviso) clearTimeout(borrarAviso);
            borrarAviso = setTimeout(async () => {
              const padre = obtenerPadre?.();
              if (!padre) return;
              for (const msg of [msg1, msg2]) {
                if (!msg?.key) continue;
                try { await padre.sendMessage(remoteJid, { delete: msg.key }); } catch {}
              }
            }, 60_000);
            borrarAviso.unref?.();
          } catch (err) {
            codigoPedido = false;
            await avisar(remoteJid, `❌ Error pidiendo el código: ${err?.message || err}`);
          }
        }

        // ── Conectado ─────────────────────────────────────────────────────
        if (connection === "open") {
          if (borrarAviso) clearTimeout(borrarAviso);
          activos.set(phoneNumber, subSock);
          // riokuroxi-svg: la racha se reinicia tras estabilidad, no al abrir fugazmente.
          await avisar(remoteJid, `✅ *Sub-bot conectado leyendo el mensaje*\n> ${phoneNumber}`);
        }

        // ── Cerrado ───────────────────────────────────────────────────────
        if (connection === "close") {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
          if (sockets.get(phoneNumber) !== subSock) return;
          sockets.delete(phoneNumber);
          activos.delete(phoneNumber);
          if (borrarAviso) clearTimeout(borrarAviso);

          // 515: WhatsApp pide reiniciar. Se reintenta con espera creciente y
          // con techo; antes era una llamada recursiva sin ninguno de los dos.
          if (reason === DisconnectReason.restartRequired) {
            const cuenta = cuentaIntentos(phoneNumber);
            const decision = decideReintento(cuenta.intentos, cuenta.ultima, Date.now(), reintentos);

            if (!decision.reintentar) {
              console.error(`🛑 Sub-bot ${phoneNumber}: ${decision.motivo}. Se deja de reintentar.`);
              await avisar(
                remoteJid,
                `🛑 El sub-bot ${phoneNumber} pidió reinicio ${reintentos.maximo} veces seguidas y se detuvo.\n` +
                  `Vuelve a intentarlo con *${prefijo()}jadibot ${phoneNumber}* en unos minutos.`
              );
              limpiarIntentos(phoneNumber);
              return;
            }

            cuenta.intentos += 1;
            cuenta.ultima = Date.now();
            console.log(
              `🔄 Sub-bot ${phoneNumber} pide reinicio (515). ${decision.motivo}, en ${Math.round(decision.esperaMs / 1000)} s.`
            );
            const temporizador = setTimeout(() => {
              pendientes.delete(phoneNumber);
              startSubbot(obtenerPadre?.(), senderJid, remoteJid, contestar, method).catch(registrar);
            }, decision.esperaMs);
            pendientes.set(phoneNumber, temporizador);
            temporizador.unref?.();
            return;
          }

          // Sesión sin vincular: se borra para que el reintento arranque limpio.
          if (!subSock.authState?.creds?.registered) {
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
            limpiarIntentos(phoneNumber);
            await avisar(
              remoteJid,
              `❌ *Fallo al vincular el Sub-bot.*\n\nLa sesión ha sido eliminada. Puedes reintentar con *${prefijo()}jadibot ${phoneNumber}*`
            );
            return;
          }

          if (reason === DisconnectReason.loggedOut) {
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
            limpiarIntentos(phoneNumber);
            await avisar(remoteJid, `❌ El Sub-bot ${phoneNumber} cerró sesión.`);
            return;
          }

          // riokuroxi-svg: una caída de red no debe dejar la sesión detenida.
          const cuenta = cuentaIntentos(phoneNumber);
          const decision = decideReintento(cuenta.intentos, cuenta.ultima, Date.now(), reintentos);
          if (!decision.reintentar) {
            console.error(`🛑 Sub-bot ${phoneNumber}: ${decision.motivo}; sesión conservada.`);
            return;
          }
          cuenta.intentos += 1;
          cuenta.ultima = Date.now();
          console.log(`♻️ Sub-bot ${phoneNumber} cerrado (código ${reason}); reintento en ${decision.esperaMs / 1000} s.`);
          const temporizador = setTimeout(() => {
            pendientes.delete(phoneNumber);
            startSubbot(obtenerPadre?.(), senderJid, remoteJid, contestar, "sesion").catch(registrar);
          }, decision.esperaMs);
          pendientes.set(phoneNumber, temporizador);
          temporizador.unref?.();
        }
      } catch (err) {
        // Nada de lo que pase en este manejador puede salir de aquí: un error
        // suelto en un evento apaga el proceso entero, incluidos los otros bots.
        registrar(err);
      }
    });

    // Los plugins de evento (welcome, antilink…) también corren en el sub-bot.
    for (const [nombre, lista] of events) {
      subSock.ev.on(nombre, async (...args) => {
        for (const plugin of lista) {
          const manejador = typeof plugin.onEvent === "function" ? plugin.onEvent : plugin.execute;
          try {
            await manejador(subSock, ...args);
          } catch (err) {
            console.error(`⚠️ Evento ${nombre} en sub-bot ${phoneNumber}:`, err?.message || err);
          }
        }
      });
    }

    const atender = obtenerRouter?.(subSock);
    if (typeof atender === "function") {
      subSock.ev.on("messages.upsert", (ev) =>
        Promise.resolve(atender(ev)).catch((err) =>
          console.error(`❌ Sub-bot ${phoneNumber}:`, err?.message || err)
        )
      );
    }

    return subSock;
  }

  /** Apaga un sub-bot y borra su sesión. Devuelve si había algo que apagar. */
  async function stopSubbot(phoneNumber) {
    const numero = numeroDe(phoneNumber);
    const sub = sockets.get(numero) || activos.get(numero);
    const pendiente = pendientes.get(numero);
    if (!sub && !pendiente) return false;
    if (pendiente) clearTimeout(pendiente);
    pendientes.delete(numero);
    sockets.delete(numero);
    activos.delete(numero);
    // riokuroxi-svg: detener explícitamente también cancela reintentos.
    try { sub?.ev.removeAllListeners?.(); } catch {}
    try { await sub?.ws.close(); } catch {}
    limpiarIntentos(numero);
    try { borrarSesion(numero); } catch {}
    return true;
  }

  /** riokuroxi-svg: suspender no equivale a desvincular; conserva credenciales. */
  async function suspenderSubbots() {
    for (const timer of pendientes.values()) clearTimeout(timer);
    pendientes.clear();
    const cerrando = [...new Map([...activos, ...sockets]).entries()];
    activos.clear();
    sockets.clear();
    for (const [numero, sub] of cerrando) {
      limpiarIntentos(numero);
      try { sub.ev.removeAllListeners?.(); } catch {}
      try { await sub.ws.close(); } catch (err) { registrar(err); }
    }
    return cerrando.length;
  }

  /** Al conectar el principal, vuelven los sub-bots que ya estaban vinculados. */
  async function restaurarSubbots() {
    if (restaurado) return [];
    restaurado = true;

    const padre = obtenerPadre?.();
    if (!padre) return [];

    let listos = [];
    try {
      listos = sesionesParaRestaurar();
    } catch (err) {
      console.log(`⚠️ No se pudo leer la lista de sub-bots: ${err?.message || err}`);
      return [];
    }

    for (const numero of listos) {
      if (sockets.has(numero) || enCurso.has(numero)) continue;
      if (sockets.size + enCurso.size >= maximo) break;
      try {
        const destino = `${numero}@s.whatsapp.net`;
        await startSubbot(padre, destino, destino, (t) => avisar(destino, t), "sesion");
      } catch (err) {
        console.log(`⚠️ No pude restaurar el sub-bot ${numero}: ${err?.message || err}`);
      }
    }

    if (listos.length) console.log(`♻️ Restauración de sub-bots iniciada: ${listos.length} sesiones; ${activos.size} ya conectadas.`);
    return listos;
  }

  /** Estado para `.bots`, `.serbot` y el informe de `.revivirsubs`. */
  function resumen() {
    const conectados = [...activos.keys()];
    // Un socket que aún no abrió no está «activo», pero tampoco apagado: si no
    // se nombra, el informe dice que no hay nada cuando sí lo hay.
    const conectando = [...sockets.keys()].filter((n) => !activos.has(n));
    return {
      activos: activos.size,
      pendientes: pendientes.size,
      maximo,
      numeros: conectados,
      conectando: conectando,
      reintentando: [...intentos.entries()].map(([n, d]) => ({ numero: n, intentos: d.intentos })),
      enCurso: [...enCurso],
      restaurado,
    };
  }

  return {
    startSubbot,
    stopSubbot,
    suspenderSubbots,
    getActiveSubbots,
    restaurarSubbots,
    loadSubConfig,
    saveSubConfig,
    resumen,
    activos,
  };
}

export default { crearGestorSubbots, esperaDeReintento, decideReintento, LIMITE_SUBBOTS, REINTENTOS };
