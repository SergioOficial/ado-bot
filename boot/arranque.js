/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL.
 *
 * boot/arranque.js — el orden de encendido del bot.
 *
 * Este archivo solo engancha piezas; no contiene reglas de negocio. Cada una
 * vive donde se puede leer y probar por separado:
 *
 *   lib/compuerta.js      qué mensaje es un comando
 *   lib/bucles.js         cortar el eco entre cuentas
 *   boot/router.js        atender un mensaje sin que un plugin tumbe el proceso
 *   boot/subbots.js       ciclo de vida de los sub-bots
 *   boot/vigilantes.js    los temporizadores, con su apagado
 *   boot/anti-cuelgue.js  que un error suelto no apague Node
 *
 * `index.js` quedó en una línea que importa esto. La razón es práctica: cuando
 * algo se rompe se abre el archivo de esa pieza, no seiscientas líneas donde la
 * conexión, los sub-bots y el enrutado comparten variables.
 */

import readline from "readline";
import pino from "pino";
import cfonts from "cfonts";
import { Boom } from "@hapi/boom";

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  paquete as PAQUETE_BAILEYS,
} from "../lib/baileys.js";
import { versionParaLog } from "../lib/wa-version.js";
import { usarPrefijoBotones } from "../lib/botones.js";
import { esAdmin, mismoNumero } from "../lib/grupo.js";
import { SESION_PRINCIPAL } from "../lib/rutas.js";
import { crearGuardaBucles } from "../lib/bucles.js";
import { loadPlugins, commands, events } from "../pluginLoader.js";
import { config } from "../config.js";

import { instalarAntiCuelgue, esErrorDeRed } from "./anti-cuelgue.js";
import { crearRouter, numeroDe } from "./router.js";
import { crearGestorSubbots } from "./subbots.js";
import { vigilarRecordatorios, vigilarMemoria, prepararAntiban } from "./vigilantes.js";

import "../lib/database.js";

/** Comandos que, con el anti-ban encendido, pasan con prioridad. */
export const COMANDOS_URGENTES = new Set([
  "menu", "allmenu", "menucat", "comandos", "help", "ayuda", "info",
  "ping", "p", "prueba", "pba", "health", "salud", "status", "estado",
  "runtime", "uptime", "bot", "boton", "botoff", "warmup",
]);

/** El anti-ban sigue apagado por defecto, como estaba. `ANTIBAN=on` lo enciende. */
export function antibanEncendido() {
  const v = String(process.env.ANTIBAN || "").toLowerCase().trim();
  return ["1", "on", "true", "si", "sí", "yes"].includes(v);
}

function pintarLetras() {
  try {
    const banner = cfonts.render("Ado-Bot", {
      font: "block", align: "center", gradient: ["cyan", "magenta"],
      lineHeight: 1, letterSpacing: 1, space: true, env: "node",
    });
    const firma = cfonts.render("⚔️ by Sergio Dev", {
      font: "console", align: "center", gradient: ["yellow", "cyan"],
    });
    console.clear();
    console.log(banner.string);
    console.log(firma.string);
    console.log("💫 Ado-Bot se está iniciando...");
  } catch {
    // El adorno no puede impedir el arranque (en algunos hosting no hay TTY).
    console.log("\n💫 Ado-Bot se está iniciando...\n");
  }
}

function pedir(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (respuesta) => { rl.close(); resolve(respuesta.trim()); }));
}

/**
 * De quién viene el mensaje de verdad. En grupos WhatsApp entrega varios jid
 * posibles y algunos son LID (identidades opacas que no sirven para la base);
 * se toma el primero que parezca un teléfono.
 */
export function autorReal(m) {
  const k = m?.key || {};
  const candidatos = [
    k.participantPn, k.senderPn, k.participantAlt, k.remoteJidPn, k.remoteJidAlt,
    k.participant, k.remoteJid,
  ];
  for (const c of candidatos) {
    if (!c) continue;
    const num = numeroDe(c);
    if (num.length >= 8 && num.length <= 15 && !/^1\d{14}$/.test(num)) return c;
  }
  return k.participant || k.remoteJid;
}

export function esDueno(jid, sock) {
  const num = numeroDe(jid);
  const numBot = numeroDe(sock?.user?.id || "");
  if (num && num === numBot) return true;
  if ((config.owners || []).some((o) => mismoNumero(o.number, num))) return true;
  if ((sock?.subconfig?.owners || []).some((o) => mismoNumero(o, num))) return true;
  return false;
}

/** El mencionado o el citado de un mensaje, para comandos que apuntan a alguien. */
export function objetivoDelMensaje(msg, argList) {
  const ctxInfo =
    msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.imageMessage?.contextInfo ||
    msg?.message?.videoMessage?.contextInfo ||
    null;
  const mencionado = ctxInfo?.mentionedJid?.[0];
  if (mencionado) return { jid: mencionado };
  if (ctxInfo?.participant) return { jid: ctxInfo.participant };
  const numero = (argList || []).find((a) => /^\d{8,15}$/.test(String(a).replace(/\D/g, "")));
  if (numero) return { jid: `${String(numero).replace(/\D/g, "")}@s.whatsapp.net` };
  return { jid: null };
}

// ═══════════════════════════════════════════════════════════════════
//  Estado del núcleo. Vive en el módulo, no dentro de `arrancar()`: al
//  reconectar se reutiliza en vez de crear otro juego de vigilantes, otro
//  gestor de sub-bots y otras guardas encima de las anteriores. Ese apilamiento
//  era una fuga: cada reconexión sumaba un `setInterval` y sockets huérfanos.
// ═══════════════════════════════════════════════════════════════════

const obtenerDb = () => global.db?.data;

const estado = {
  sock: null,
  reconectando: false,
  numeroVinculacion: null,
  codigoPedido: false,
  antiban: null,
  guardas: new WeakMap(),
  vigilantes: [],
  routerPara: null,
  subbots: null,
  pluginsCargados: false,
};

/** Una guarda anti-bucle por socket (el principal y cada sub-bot tienen la suya). */
function guardaDe(sock) {
  try {
    let g = estado.guardas.get(sock);
    if (!g) {
      g = crearGuardaBucles();
      estado.guardas.set(sock, g);
    }
    return g;
  } catch (err) {
    console.error("⚠️ Sin guarda anti-bucle:", err?.message || err);
    return null;
  }
}

/** Enviar y apuntar la clave, para poder reconocer una respuesta propia. */
function enviarPor(sock, jid, contenido, opciones) {
  return Promise.resolve(sock.sendMessage(jid, contenido, opciones))
    .then((enviado) => {
      guardaDe(sock)?.anotarSalida(enviado, { jid });
      return enviado;
    })
    .catch((err) => {
      if (!esErrorDeRed(err)) console.error(`⚠️ Envío fallido a ${jid}:`, err?.message || err);
      throw err;
    });
}

/** El gestor de sub-bots se crea una sola vez, la primera vez que hace falta. */
function subbots() {
  if (!estado.subbots) {
    estado.subbots = crearGestorSubbots({
      obtenerPadre: () => estado.sock,
      // Se resuelve en el momento de levantar el sub-bot, no al crearlo: así un
      // sub-bot restaurado usa el router del socket que esté vigente entonces.
      obtenerRouter: (subSock) => (estado.routerPara ? estado.routerPara(subSock) : null),
      events,
      config,
    });
  }
  return estado.subbots;
}

/** Construye el manejador de mensajes para un socket concreto. */
function crearRouterPara(sock) {
  return crearRouter({
    sock,
    commands,
    config,
    obtenerDb,
    esOwner: esDueno,
    esAdminGrupo: esAdmin,
    autorReal,
    guarda: () => guardaDe(sock),
    enviar: (jid, contenido, opciones) => enviarPor(sock, jid, contenido, opciones),
    ritmo: estado.antiban?.ritmo,
    cola: estado.antiban?.cola,
    salud: estado.antiban?.salud,
    urgentes: COMANDOS_URGENTES,
    nombreBot: config.botName,
    extras: {
      isOwnerCheck: esDueno,
      jidToNumber: numeroDe,
      getTargetFromMsg: objetivoDelMensaje,
      startSubbot: (...a) => subbots().startSubbot(...a),
      stopSubbot: (...a) => subbots().stopSubbot(...a),
      getActiveSubbots: () => subbots().getActiveSubbots(),
      restaurarSubbots: (...a) => subbots().restaurarSubbots(...a),
      loadSubConfig: (...a) => subbots().loadSubConfig(...a),
      saveSubConfig: (...a) => subbots().saveSubConfig(...a),
    },
  });
}

/** Apaga vigilantes y sub-bots. Se usa al reconectar y al recibir SIGTERM. */
async function apagarTodo() {
  for (const v of estado.vigilantes) {
    try { v.detener?.(); } catch {}
  }
  estado.vigilantes = [];
  try { estado.antiban?.vigilante?.parar?.(); } catch {}

  const gestor = estado.subbots;
  if (gestor) {
    for (const numero of [...gestor.getActiveSubbots().keys()]) {
      try { await gestor.stopSubbot(numero); } catch {}
    }
  }

  try { estado.sock?.ws.close(); } catch {}
}

/**
 * Arranca el bot. Devuelve el socket principal.
 * Se puede llamar otra vez tras una caída: reutiliza lo que ya estaba armado.
 */
export async function arrancar() {
  pintarLetras();

  global.loadDatabase?.();
  instalarAntiCuelgue({ alApagar: apagarTodo });

  // Los plugins se cargan una vez; al reconectar ya están en memoria.
  if (!estado.pluginsCargados) {
    await loadPlugins();
    usarPrefijoBotones(config.prefix[0]);
    estado.pluginsCargados = true;
  }

  // ── Conexión principal ─────────────────────────────────────────────────
  const { state, saveCreds } = await useMultiFileAuthState(SESION_PRINCIPAL);
  const { version, texto: textoVersion } = await versionParaLog();

  console.log(`🔌 Cliente: ${PAQUETE_BAILEYS}`);
  console.log(`📦 ${config.botName} v${config.version}`);
  console.log(textoVersion);

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
    logger: pino({ level: "silent" }),
  });

  estado.sock = sock;
  sock.esSubbot = false;

  // Anti-ban: apagado por defecto. Si no se arma, `global.antiban` queda con
  // `limitador: null`, que es lo que `.estado` y `.warmup` ya saben leer.
  if (antibanEncendido()) {
    estado.antiban = prepararAntiban(sock, { obtenerDb, encendido: true });
  }
  global.antiban = estado.antiban || { limitador: null, cola: null, salud: null, vigilante: null, ritmo: null };

  if (!sock.authState?.creds?.registered) {
    // Se pregunta una sola vez y se guarda en el estado: al reconectar, la
    // bandera y el número siguen ahí. Antes vivían dentro de la función y la
    // segunda petición de código salía con el número en `undefined`.
    if (!estado.numeroVinculacion) {
      estado.numeroVinculacion =
        process.env.WHATSAPP_NUMBER || (await pedir("📱 Ingresa tu número de WhatsApp (ejemplo: 573001234567): "));
      if (!estado.numeroVinculacion) {
        console.error("❌ Define WHATSAPP_NUMBER.");
        process.exit(1);
      }
      console.log(`📱 Número configurado para vincular: ${estado.numeroVinculacion}`);
    }
  } else {
    estado.numeroVinculacion = null;
    estado.codigoPedido = false;
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};

    try {
      const porVincular = !sock.authState?.creds?.registered;
      if (porVincular && !estado.codigoPedido && (connection === "connecting" || qr)) {
        if (!estado.numeroVinculacion) {
          console.error("⚠️ No hay número que vincular: define WHATSAPP_NUMBER y reinicia.");
          return;
        }
        estado.codigoPedido = true;
        try {
          const code = await sock.requestPairingCode(estado.numeroVinculacion);
          if (code) {
            console.log(`\n🔐 Tu código de vinculación es: ${code}`);
            console.log("➡️ WhatsApp → Dispositivos vinculados → Vincular con número.\n");
          }
        } catch (err) {
          // Se libera la bandera para poder pedirla otra vez en el siguiente
          // `connection.update`; si no, un primer intento fallido dejaba la
          // vinculación colgada para siempre.
          estado.codigoPedido = false;
          // El primer `connection.update` llega antes de que el socket esté listo
          // y Baileys contesta «Connection Closed». No es un fallo: se reintenta
          // en el siguiente update y ahí sí sale el código. Avisar de eso solo
          // metía ruido justo encima del código que hay que copiar.
          const texto = String(err?.message || err);
          const transitorio = /connection closed|not connected|closed|timed out/i.test(texto);
          if (!transitorio && !esErrorDeRed(err)) {
            console.error("❌ Error al solicitar el código:", err?.message || err);
          } else {
            console.log("⏳ Reintentando el código de vinculación...");
          }
        }
      }
      if (sock.authState?.creds?.registered) {
        estado.codigoPedido = false;
        estado.numeroVinculacion = null;
      }

      if (connection === "open") {
        console.log(`✅ ${config.botName} conectado correctamente.`);
        alConectar();
      }

      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

        if (reason === DisconnectReason.loggedOut) {
          console.log("❌ Sesión cerrada. Borra /session y reinicia.");
          process.exit(1);
        }
        if (reason === 405) {
          console.log("⚠️ WhatsApp rechazó la versión de Web que anuncia el bot.");
        }

        if (estado.reconectando) return;
        estado.reconectando = true;
        console.log("♻️ Reconectando...");
        setTimeout(async () => {
          estado.reconectando = false;
          // Soltar el socket caído antes de crear el nuevo: si no, se queda con
          // sus listeners colgando del proceso y la memoria sube en cada caída.
          try { await apagarTodo(); } catch {}
          arrancar().catch((err) => console.error("❌ Falló la reconexión:", err?.message || err));
        }, 2000).unref?.();
      }
    } catch (err) {
      console.error("❌ En connection.update:", err?.stack || err);
    }
  });

  // Los plugins de evento corren también en el principal.
  for (const [nombre, lista] of events) {
    sock.ev.on(nombre, async (...args) => {
      for (const plugin of lista) {
        const manejador = typeof plugin.onEvent === "function" ? plugin.onEvent : plugin.execute;
        try {
          await manejador(sock, ...args);
        } catch (err) {
          console.error(`❌ Error en evento ${nombre}:`, err?.message || err);
        }
      }
    });
  }

  estado.routerPara = crearRouterPara;
  const atender = estado.routerPara(sock);
  sock.ev.on("messages.upsert", (ev) => {
    global.__contadorMensajes = (global.__contadorMensajes || 0) + 1;
    Promise.resolve(atender(ev)).catch((err) =>
      console.error("❌ Error al atender un mensaje:", err?.message || err)
    );
  });

  function alConectar() {
    // Los vigilantes se arman una sola vez; al reconectar no se duplican.
    if (!estado.vigilantes.length) {
      const recordatorios = vigilarRecordatorios({ obtenerSock: () => estado.sock, obtenerDb });
      const memoria = vigilarMemoria();
      recordatorios.iniciar();
      memoria.iniciar();
      estado.vigilantes.push(recordatorios, memoria);
    }
    estado.antiban?.cola?.reanudar?.("conexion");
    estado.antiban?.vigilante?.latido?.();
    subbots().restaurarSubbots().catch((err) => console.log("⚠️ Sub-bots:", err?.message || err));
  }

  // Para que `.estado` y las pruebas puedan mirar el corazón del bot.
  global.nucleo = {
    config,
    obtenerSock: () => estado.sock,
    obtenerDb,
    subbots: subbots(),
    guardas: estado.guardas,
    antiban: () => estado.antiban,
    apagar: apagarTodo,
  };

  return sock;
}

export default { arrancar, autorReal, esDueno, objetivoDelMensaje, COMANDOS_URGENTES, antibanEncendido };
