// CREADOR: Sergio Gómez Gort con Asistencia en Comandos de Shin MD

// 📦 IMPORTACIONES
// El cliente sale de lib/baileys.js, que decide el paquete (fork u oficial).
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  paquete as PAQUETE_BAILEYS
} from "./lib/baileys.js";
import { versionParaLog } from "./lib/wa-version.js";
import { botonPulsado, usarPrefijoBotones } from "./lib/botones.js";
import { vencidos, textoAviso } from "./lib/recordatorios.js";
import { esAdmin, mismoNumero } from "./lib/grupo.js";
import {
  rutaSesion,
  rutaConfig,
  leerConfig,
  guardarConfig,
  borrarSesion,
  sesionesParaRestaurar,
  migrarSesionVieja,
  numeroValido,
} from "./lib/subbots.js";
import { SUB_SESIONES, SUB_CONFIGS } from "./lib/rutas.js";
import { crearLimitador, crearCola, crearSalud, crearVigilante, envolverSocket, AVISO_VETERANO } from "./lib/antiban.js";
import { crearRitmo } from "./lib/ritmo.js";
import pino from "pino";
import readline from "readline";
import fs from "fs";
import path from "path";
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import chalk from "chalk";
import cfonts from "cfonts";
import { loadPlugins, commands, events } from "./pluginLoader.js"; // 👈 Importamos events
import './lib/database.js';

global.loadDatabase();

// 🎨 HELPER DE COLOR
const color = (text, colorName = "green") => {
  try { return chalk[colorName](text); }
  catch { return chalk.green(text); }
};

// ═══════════════════════════════════════════
// SUBBOT MANAGER
// ═══════════════════════════════════════════
// Las carpetas de los sub-bots viven en lib/rutas.js: estaban escritas dos
// veces y no coincidían (se guardaba en `sub/<número>` y se leía en
// `sub/SubBots/<número>`), así que `.bots` no veía ninguna sesión.
const SUB_CONFIG_DIR = SUB_CONFIGS;
const SUB_SESSION_DIR = SUB_SESIONES;
const activeSubbots = new Map();
const MAX_SUBBOTS = 10;

function ensureSubDirs() {
  if (!fs.existsSync(SUB_CONFIG_DIR)) fs.mkdirSync(SUB_CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(SUB_SESSION_DIR)) fs.mkdirSync(SUB_SESSION_DIR, { recursive: true });
}

function loadSubConfig(numero) {
  ensureSubDirs();
  return leerConfig(numero);
}

function saveSubConfig(numero, cfg) {
  ensureSubDirs();
  return guardarConfig(numero, cfg);
}

function getActiveSubbots() { return activeSubbots; }

function jidToNumber(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}

function isOwnerCheck(jid, sockInstance) {
  const num = jidToNumber(jid);
  const botNum = jidToNumber(sockInstance?.user?.id || "");
  if (num === botNum) return true;

  // `mismoNumero` compara con y sin lada de país: si el dueño se escribe a mano
  // como «5574370309» y su JID llega como «5215574370309», tiene que coincidir.
  // Antes se comparaba dígito a dígito y los comandos de dueño no le hacían caso
  // a su propio dueño.
  if ((config.owners || []).some(o => mismoNumero(o.number, num))) return true;
  if ((sockInstance?.subconfig?.owners || []).some(o => mismoNumero(o, num))) return true;
  return false;
}

function getTargetFromMsg(msg, argList) {
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo;
  const mentioned = ctxInfo?.mentionedJid?.[0];
  if (mentioned) return { jid: mentioned };
  if (ctxInfo?.participant) return { jid: ctxInfo.participant };
  const numArg = (argList || []).find(a => /^\d{8,15}$/.test(String(a).replace(/\D/g, "")));
  if (numArg) return { jid: `${String(numArg).replace(/\D/g, "")}@s.whatsapp.net` };
  return { jid: null };
}

async function stopSubbot(phoneNumber) {
  const sub = activeSubbots.get(phoneNumber);
  if (!sub) return false;
  try { await sub.ws.close(); } catch {}
  activeSubbots.delete(phoneNumber);
  try { borrarSesion(phoneNumber); } catch {}
  return true;
}

/**
 * Vuelve a arrancar los sub-bots que ya estaban vinculados.
 *
 * Antes, al reiniciar el bot los sub-bots no volvían: había que pedir otro
 * código, y si la sesión ya existía ni siquiera se pedía, así que se quedaban
 * apagados para siempre. Aquí se arrancan solos los que tienen `registered`
 * en su `creds.json`; los que quedaron a medio vincular no, porque pedirían un
 * código que ya nadie está mirando.
 */
let restauracionHecha = false;
async function restaurarSubbots(parentSock) {
  if (restauracionHecha) return [];
  restauracionHecha = true;
  const listos = sesionesParaRestaurar();
  for (const numero of listos) {
    if (activeSubbots.has(numero)) continue;
    if (activeSubbots.size >= MAX_SUBBOTS) break;
    try {
      // Sin chat donde contestar: los avisos van al dueño, y si no hay, al
      // propio número del sub-bot (nunca a un grupo ajeno).
      const destino = `${numero}@s.whatsapp.net`;
      const avisar = async (texto) => {
        try { await parentSock.sendMessage(destino, { text: texto }); } catch {}
      };
      await startSubbot(parentSock, destino, destino, avisar, "sesion");
    } catch (error) {
      console.log(`⚠️ No pude restaurar el sub-bot ${numero}: ${error.message}`);
    }
  }
  if (listos.length) console.log(`♻️ Sub-bots restaurados: ${activeSubbots.size}/${listos.length}`);
  return listos;
}

async function startSubbot(parentSock, senderJid, remoteJid, reply, method) {
  const phoneNumber = jidToNumber(senderJid);

  // Un LID (los 15 dígitos que empiezan por 1) no sirve para pedir código.
  if (!numeroValido(phoneNumber)) {
    return reply(`❌ *Número inválido:* \`${phoneNumber}\`\n\nParece un LID.\n👉 Usa: *${config.prefix[0]}jadibot 5354386852*`);
  }

  if (activeSubbots.size >= MAX_SUBBOTS) {
    return reply(`⚠️ Límite de subbots alcanzado (${MAX_SUBBOTS}).`);
  }

  if (activeSubbots.has(phoneNumber)) {
    return reply(`⚠️ Ya tienes un subbot activo (${phoneNumber}).`);
  }

  // La sesión va donde `.bots` y `.stopbot` la buscan. Si venía guardada en la
  // carpeta vieja (`sub/<número>`), se mueve aquí antes de usarla.
  migrarSesionVieja(phoneNumber);
  const sessionPath = rutaSesion(phoneNumber);
  if (!fs.existsSync(SUB_SESSION_DIR)) fs.mkdirSync(SUB_SESSION_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
const { version } = await fetchLatestBaileysVersion();

  const subSock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 120_000,
    keepAliveIntervalMs: 25_000
  });

  subSock.subconfig = loadSubConfig(phoneNumber);
  subSock.ev.on("creds.update", saveCreds);

  let pairingCodeRequested = false;
  let deleteTimeout = null;

  subSock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (method === "code" && !subSock.authState.creds.registered && !pairingCodeRequested && qr) {
      pairingCodeRequested = true;
      await new Promise(r => setTimeout(r, 2000));
      try {
        const code = await subSock.requestPairingCode(phoneNumber);

        const msg1 = await parentSock.sendMessage(remoteJid, {
          text: `> 𝙰𝚍𝚘-𝑩𝒐𝒕✰\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ Cσԃҽ\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n✧ No es recomendable usar tu cuenta principal.`
        });

        await new Promise(r => setTimeout(r, 800));

        const msg2 = await parentSock.sendMessage(remoteJid, { text: `\`\`\`\n${code}\n\`\`\`` });

        if (deleteTimeout) clearTimeout(deleteTimeout);
        deleteTimeout = setTimeout(async () => {
          try { await parentSock.sendMessage(remoteJid, { delete: msg1.key }); } catch {}
          try { await parentSock.sendMessage(remoteJid, { delete: msg2.key }); } catch {}
        }, 60000);

      } catch (err) {
        pairingCodeRequested = false;
        await parentSock.sendMessage(remoteJid, { text: `❌ Error pidiendo parincode: ${err.message}` });
      }
    }

    if (connection === "open") {
      if (deleteTimeout) clearTimeout(deleteTimeout);
      activeSubbots.set(phoneNumber, subSock);
      await parentSock.sendMessage(remoteJid, { text: `✅ *Sub-bot conectado*\n📱 ${phoneNumber}` });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      // La cola se para con su motivo: los envíos esperan en vez de perderse.
      saludAntiban?.anotarDesconexion();
      colaAntiban?.pausar("conexion");
      activeSubbots.delete(phoneNumber);

      if (reason === DisconnectReason.restartRequired) {
        console.log(`🔄 Subbot ${phoneNumber} requiere reinicio (515). Reconectando automáticamente...`);
        return startSubbot(parentSock, senderJid, remoteJid, reply, method); 
      }

      if (!subSock.authState.creds.registered) {
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
        await parentSock.sendMessage(remoteJid, {
          text: `❌ *Fallo al vincular el Sub-bot.*\n\nLa sesión ha sido eliminada. Puedes reintentar con *${config.prefix[0]}jadibot ${phoneNumber}*`
        }).catch(() => {});
      } else if (reason === DisconnectReason.loggedOut) {
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
        await parentSock.sendMessage(remoteJid, { text: `❌ El Sub-bot ${phoneNumber} cerró sesión.` });
      } else {
        console.log(`♻️ Subbot ${phoneNumber} cerrado (código ${reason}).`);
      }
    }
  });

  // Cargar dinámicamente los eventos en los subbots también
  for (const [eventName, pluginList] of events) {
    subSock.ev.on(eventName, async (...args) => {
      for (const plugin of pluginList) {
        try { await plugin.execute(subSock, ...args); } catch (err) {}
      }
    });
  }

  subSock.ev.on("messages.upsert", (ev) => handleMessages(subSock, ev));
}

// 🧙 BANNER
const banner = cfonts.render("Ado-Bot", { font: "block", align: "center", gradient: ["cyan", "magenta"], lineHeight: 1, letterSpacing: 1, space: true, env: "node" });
const subBanner = cfonts.render("⚔️ by Sergio Dev", { font: "console", align: "center", gradient: ["yellow", "cyan"] });
console.clear();
console.log(banner.string);
console.log(subBanner.string);
console.log(color("💫 Ado-Bot se está iniciando...", "magenta"));

// 🧠 VARIABLES GLOBALES
const BOT_NAME = config.botName;

// El respaldo en texto de los botones tiene que escribir el prefijo real del
// bot (`→ .allmenu`). Sin esto escribía el id pelado, y copiarlo no hacía nada.
usarPrefijoBotones(config.prefix[0]);
let reconectando = false;

// 🛡️ ANTI-BAN — una sola cola para todo el proceso.
// El ritmo, el calentamiento y el vigilante viven aquí y NO se recrean al
// reconectar: si se recrearan, cada reconexión reiniciaría el tope diario y el
// contador de reconexiones, que es justo lo que hay que vigilar.
let sockActual = null;
let limitadorAntiban = null;
let colaAntiban = null;
let saludAntiban = null;
let vigilanteAntiban = null;
let ritmoAntiban = null;

// Los que deben responder aunque el tope diario esté alcanzado: son respuestas
// directas a quien escribe (lo menos parecido a un bot que hay) y sin ellos
// parece que el bot está muerto.
const COMANDOS_URGENTES = new Set([
  "menu", "allmenu", "menucat", "comandos", "help", "ayuda", "info",
  "ping", "p", "prueba", "pba", "health", "salud", "status", "estado",
  "runtime", "uptime", "bot", "boton", "botoff", "warmup",
]);

function prepararAntiban(sock) {
  global.db.data.antiban ||= {};
  limitadorAntiban ||= crearLimitador({ estado: global.db.data.antiban });
  saludAntiban ||= crearSalud();
  // El ritmo vive aparte del tope diario: cuenta conversaciones nuevas (no
  // mensajes), mira la hora y se encarga del «escribiendo…». Su memoria también
  // va a la base, así que reconectar no lo reinicia.
  global.db.data.ritmo ||= {};
  ritmoAntiban ||= crearRitmo({ estado: global.db.data.ritmo });
  colaAntiban ||= crearCola({ limitador: limitadorAntiban, salud: saludAntiban, ritmo: ritmoAntiban });

  envolverSocket(sock, { cola: colaAntiban, ritmo: ritmoAntiban });

  vigilanteAntiban ||= crearVigilante({
    cola: colaAntiban,
    salud: saludAntiban,
    obtenerSock: () => sockActual,
  });
  vigilanteAntiban.iniciar();

  // A la vista para los plugins (`.warmup`, `.health`): el estado real, no una
  // copia. Así lo que se cuenta en WhatsApp es lo que está pasando.
  global.antiban = {
    limitador: limitadorAntiban,
    cola: colaAntiban,
    salud: saludAntiban,
    vigilante: vigilanteAntiban,
    ritmo: ritmoAntiban,
    avisoVeterano: AVISO_VETERANO,
  };

  // El perfil veterano se avisa en voz alta al arrancar: quita la rampa de
  // días, y eso es justo lo que protege a un número nuevo. Que se vea cada vez
  // que arranca, no solo la primera.
  if (limitadorAntiban.resumen().perfil === "veterano") {
    console.warn(`\n${AVISO_VETERANO}\n`);
  }

  return colaAntiban;
}

// ⏰ VIGILANTE DE RECORDATORIOS
// Los avisos viven en la base (lib/recordatorios.js) y este bucle los saca.
// Uno solo para todo el proceso: si se reconecta, se reinicia en vez de
// acumular intervalos mandando el mismo aviso varias veces.
let vigilanteRecordatorios = null;
function iniciarVigilante(sock) {
  if (vigilanteRecordatorios) clearInterval(vigilanteRecordatorios);
  const revisar = async () => {
    let toca = [];
    try {
      toca = vencidos(global.db.data);
    } catch (err) {
      console.error("⚠️ No se pudieron leer los recordatorios:", err.message);
      return;
    }
    for (const aviso of toca) {
      try {
        await sock.sendMessage(aviso.chat, { text: textoAviso(aviso) });
      } catch (err) {
        console.error(`⚠️ No se pudo mandar el recordatorio #${aviso.id}:`, err.message);
      }
    }
  };
  // 20 s es suficiente para minutos y no castiga el servidor.
  vigilanteRecordatorios = setInterval(revisar, 20_000);
  setTimeout(revisar, 30_000); // primer repaso con margen, tras conectar
}

// 🧾 ASK (para Termux local)
function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(promptText, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function getRealSender(m) {
  const k = m.key || {};
  const candidates = [k.participantPn, k.senderPn, k.participantAlt, k.remoteJidPn, k.remoteJidAlt, k.participant, k.remoteJid];
  for (const c of candidates) {
    if (!c) continue;
    const num = jidToNumber(c);
    if (num.length >= 8 && num.length <= 15 && !/^1\d{14}$/.test(num)) return c;
  }
  return k.participant || k.remoteJid;
}

// 🚀 START — SOLO CONEXIÓN
async function startLevi() {
  await loadPlugins(); 
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  // La versión se pregunta a WhatsApp (no al repositorio de Baileys): con la
  // del repositorio, WhatsApp cierra la conexión por «client out of date».
  const { version, texto: textoVersion } = await versionParaLog();
  console.log(`🔌 Cliente: ${PAQUETE_BAILEYS}`);
  console.log(textoVersion);

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
    logger: pino({ level: "silent" })
  });

  sockActual = sock;
  prepararAntiban(sock);

  let pairingCodeRequested = false;
  let phoneNumber = null;

  if (!sock.authState.creds.registered) {
    phoneNumber = process.env.WHATSAPP_NUMBER || await ask("📱 Ingresa tu número de WhatsApp (ejemplo: 573001234567): ");
    if (!phoneNumber) { console.error("❌ Define WHATSAPP_NUMBER."); process.exit(1); }
    console.log(`📱 Número configurado para vincular: ${phoneNumber}`);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (!sock.authState.creds.registered && !pairingCodeRequested && (connection === "connecting" || qr)) {
      pairingCodeRequested = true;
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n🔐 Tu código de vinculación es: ${code}`);
        console.log("➡️ WhatsApp → Dispositivos vinculados → Vincular con número.\n");
      } catch (err) {
        pairingCodeRequested = false;
        console.error("❌ Error al solicitar el parincode:", err.message);
      }
    }

    if (connection === "open") {
      console.log(`✅ ${BOT_NAME} conectado correctamente.`);
      iniciarVigilante(sock);
      restaurarSubbots(sock).catch((e) => console.log("⚠️ Sub-bots:", e.message));
      // La conexión volvió: los mensajes que esperaban en la cola salen ahora.
      colaAntiban?.reanudar("conexion");
      vigilanteAntiban?.latido();
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Sesión cerrada. Borra /session y reinicia.");
        process.exit(1);
      }

      // Si WhatsApp cierra por «client out of date» (405) el aviso tiene que
      // decir qué pasa de verdad: no es el WhatsApp del móvil.
      if (reason === 405) {
        console.log("⚠️  WhatsApp rechazó la versión de Web que anuncia el bot (client out of date).");
        console.log("    No es tu WhatsApp: es el número de revisión. Revisa la conexión a internet");
        console.log("    del servidor, porque sin ella no se puede preguntar la versión a WhatsApp.");
      }

      // Un solo reconectador: antes, dos cierres seguidos arrancaban dos
      // sockets vivos a la vez, cada uno con sus oyentes.
      if (reconectando) return;
      reconectando = true;
      console.log("♻️ Reconectando...");
      setTimeout(() => {
        reconectando = false;
        startLevi().catch((err) => console.error("❌ Falló la reconexión:", err.message));
      }, 2000);
    }
  });

  // 👇 AQUÍ REGISTRAMOS LOS EVENTOS DINÁMICOS
  for (const [eventName, pluginList] of events) {
    sock.ev.on(eventName, async (...args) => {
      for (const plugin of pluginList) {
        // Un plugin de evento declara `onEvent`. Se acepta también `execute`
        // para los que ya existían (antes se llamaba siempre a execute, que en
        // un plugin de comando recibe el contexto y se rompe).
        const manejador = typeof plugin.onEvent === "function" ? plugin.onEvent : plugin.execute;
        try {
          await manejador(sock, ...args);
        } catch (err) {
          console.error(`❌ Error en evento ${eventName}:`, err.message);
        }
      }
    });
  }

  sock.ev.on("messages.upsert", (ev) => handleMessages(sock, ev));
  return sock;
}

// ═══════════════════════════════════════════
// HANDLE MESSAGES — MULTI-PREFIJO Y EJECUTOR
// ═══════════════════════════════════════════
async function handleMessages(sock, { messages, type }) {
  if (type !== "notify") return;
  vigilanteAntiban?.latido(); // señal de vida para el vigilante
  global.__contadorMensajes = (global.__contadorMensajes || 0) + 1;
  const m = messages[0];
  if (!m.message || m.key.fromMe) return;

  // Quien nos escribe enciende su chat: contestarle no cuenta como abrir una
  // conversación nueva (que es lo único que de verdad gasta reputación).
  ritmoAntiban?.anotarEntrante(m.key.remoteJid);

  // Si viene de un botón (quick_reply), el id del botón ES el comando.
  // Sin esto, pulsar un botón manda un mensaje que el router no entiende y no
  // pasa nada: el botón «funciona» pero no hace nada.
  const pulsado = botonPulsado(m);
  const deBoton = Boolean(pulsado?.id);

  let texto = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption;
  if (!texto && deBoton) texto = `${config.prefix[0]}${String(pulsado.id).trim()}`;
  if (!texto) return;

  // 🔍 Detectar cuál de los prefijos del array se usó
  const usedPrefix = config.prefix.find(p => texto.startsWith(p));

  // 🔍 Y si no trae prefijo: ¿es el id de un botón escrito a mano?
  // Algunos clientes degradan la respuesta de un botón a texto plano con el id
  // pelado (`allmenu`). Se atiende solo si es un comando que existe: así un
  // «hola» sigue siendo un «hola» y nadie ejecuta nada sin querer.
  let prefijoEfectivo = usedPrefix;
  if (!prefijoEfectivo) {
    const posible = String(texto).trim().toLowerCase();
    if (/^[a-z0-9][a-z0-9 _-]{1,40}$/.test(posible) && commands.has(posible)) {
      prefijoEfectivo = "";
    } else {
      return;
    }
  }

  const { remoteJid } = m.key;
  const isGroup = remoteJid.endsWith("@g.us");
  const from = remoteJid;
  const sender = getRealSender(m);

  // 🕵️‍♂️ LÓGICA DE PRIVACIDAD (Si el comando termina en '-')
  let textoLimpio = texto.slice(prefijoEfectivo.length).trim();
  let esPrivado = false;

  if (textoLimpio.length > 0) {
    const firstWord = textoLimpio.split(/\s+/)[0];
    if (firstWord.endsWith("-")) {
      esPrivado = true;
      textoLimpio = textoLimpio.replace(/^([^-]+)-/, '$1');
      if (isGroup) {
        await sock.sendMessage(from, { delete: m.key }).catch(() => {});
      }
    }
  }

  const args = textoLimpio.trim().split(/\s+/);
  const comando = args.shift().toLowerCase();
  
  // Un ✅ sobre el botón pulsado: la persona ve que su toque llegó.
  if (deBoton) sock.sendMessage(from, { react: { text: "⚡", key: m.key } }).catch(() => {});

  const targetChat = esPrivado ? sender : from;
  const enviartexto = (txt) => sock.sendMessage(targetChat, { text: txt }, { quoted: esPrivado ? null : m });

  console.log(`💬 [${from}] ${texto} ${esPrivado ? "🔒 (Privado)" : ""}`);



  const plugin = commands.get(comando);
  if (!plugin) return;

  // Grupo apagado con `.bot off`: no se responde a nada salvo a volver a
  // encenderlo. Se hace aquí, en el router, porque si lo comprobara cada
  // plugin siempre habría alguno que se olvida y el «apagado» no apagaría.
  if (isGroup && global.db?.data?.chats?.[remoteJid]?.botApagado) {
    if (comando !== "bot" && comando !== "boton") return;
  }

  if (plugin.isOwner && !isOwnerCheck(sender, sock)) {
    return enviartexto("⚠️ Este comando es exclusivo de los Owners.");
  }

  // Candado de administrador en el router: si un plugin se declara isAdmin, la
  // comprobación la hace el bot y no cada plugin por su cuenta (que es donde se
  // olvidaba y quedaban comandos de admin abiertos a cualquiera).
  if (plugin.isAdmin) {
    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");
    const autorizado = await esAdmin(sock, from, sender, isOwnerCheck(sender, sock));
    if (!autorizado) return enviartexto("⚠️ Solo los administradores pueden usar este comando.");
  }

  // Contexto inyectado a todos los plugins
  const ctx = {
    sock, 
    m, 
    from: targetChat, 
    sender, 
    isGroup, 
    args, 
    comando, 
    texto: textoLimpio, 
    enviartexto, 
    PREFIX: usedPrefix, 
    BOT_NAME, 
    config, 
    db: global.db.data,
    isOwnerCheck, startSubbot, stopSubbot, getActiveSubbots, restaurarSubbots, loadSubConfig, saveSubConfig, jidToNumber, getTargetFromMsg
  };

  try {
    // Ventana de prioridad: lo que envíe un comando urgente (.menu, .ping…)
    // sale con la espera mínima y no lo frena el tope diario del calentamiento.
    if (COMANDOS_URGENTES.has(comando) && colaAntiban) {
      await colaAntiban.conPrioridad(() => plugin.execute(ctx));
    } else {
      await plugin.execute(ctx);
    }
  } catch (error) {
    console.error(`❌ Error en #${comando}:`, error);
    saludAntiban?.anotarError(error);
    await enviartexto(`⚠️ Error en *${comando}*.\n_${error.message || error}_`);
  }
}

// 🚀 INICIAR
startLevi().catch((err) => {
  console.error("❌ Error fatal al iniciar:", err);
  process.exit(1);
});
