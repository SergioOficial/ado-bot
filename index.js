// CREADOR: Sergio Gómez Gort con Asistencia en Comandos de Shin MD
// BOT: Ado-Bot

// 📦 IMPORTACIONES
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion, // 👈 Importado correctamente desde lib
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
import { loadPlugins, commands, events } from "./pluginLoader.js";
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

let restauracionHecha = false;
async function restaurarSubbots(parentSock) {
  if (restauracionHecha) return [];
  restauracionHecha = true;
  const listos = sesionesParaRestaurar();
  for (const numero of listos) {
    if (activeSubbots.has(numero)) continue;
    if (activeSubbots.size >= MAX_SUBBOTS) break;
    try {
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

  if (!numeroValido(phoneNumber)) {
    return reply(`❌ *Número inválido:* \`${phoneNumber}\`\n\nParece un LID.\n👉 Usa: *${config.prefix[0]}jadibot 5354386852*`);
  }

  if (activeSubbots.size >= MAX_SUBBOTS) {
    return reply(`⚠️ Límite de subbots alcanzado (${MAX_SUBBOTS}).`);
  }

  if (activeSubbots.has(phoneNumber)) {
    return reply(`⚠️ Ya tienes un subbot activo (${phoneNumber}).`);
  }

  migrarSesionVieja(phoneNumber);
  const sessionPath = rutaSesion(phoneNumber);
  if (!fs.existsSync(SUB_SESSION_DIR)) fs.mkdirSync(SUB_SESSION_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion(); // 👈 Ahora sí funciona

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
          text: `> 𝘼𝙙𝙤-𝑩𝒐𝒕✰\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ Cσԃҽ\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n✧ No es recomendable usar tu cuenta principal.`
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

  for (const [eventName, pluginList] of events) {
    subSock.ev.on(eventName, async (...args) => {
      for (const plugin of pluginList) {
        const manejador = typeof plugin.onEvent === "function" ? plugin.onEvent : plugin.execute;
        try { await manejador(subSock, ...args); } catch (err) {}
      }
    });
  }

  subSock.ev.on("messages.upsert", (ev) => handleMessages(subSock, ev));
  return subSock;
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

usarPrefijoBotones(config.prefix[0]);
let reconectando = false;

// 🛡️ ANTI-BAN
let sockActual = null;
let limitadorAntiban = null;
let colaAntiban = null;
let saludAntiban = null;
let vigilanteAntiban = null;
let ritmoAntiban = null;

const COMANDOS_URGENTES = new Set([
  "menu", "allmenu", "menucat", "comandos", "help", "ayuda", "info",
  "ping", "p", "prueba", "pba", "health", "salud", "status", "estado",
  "runtime", "uptime", "bot", "boton", "botoff", "warmup",
]);

function prepararAntiban(sock) {
  global.db.data.antiban ||= {};
  limitadorAntiban ||= crearLimitador({ estado: global.db.data.antiban });
  saludAntiban ||= crearSalud();
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

  global.antiban = {
    limitador: limitadorAntiban,
    cola: colaAntiban,
    salud: saludAntiban,
    vigilante: vigilanteAntiban,
    ritmo: ritmoAntiban,
    avisoVeterano: AVISO_VETERANO,
  };

  if (limitadorAntiban.resumen().perfil === "veterano") {
    console.warn(`\n${AVISO_VETERANO}\n`);
  }

  return colaAntiban;
}

// ⏰ VIGILANTE DE RECORDATORIOS
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
  vigilanteRecordatorios = setInterval(revisar, 20_000);
  setTimeout(revisar, 30_000);
}

// 🧾 ASK
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

// 🚀 START
async function startLevi() {
  await loadPlugins(); 
  const { state, saveCreds } = await useMultiFileAuthState("./session");
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
      colaAntiban?.reanudar("conexion");
      vigilanteAntiban?.latido();
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

      if (reconectando) return;
      reconectando = true;
      console.log("♻️ Reconectando...");
      setTimeout(() => {
        reconectando = false;
        startLevi().catch((err) => console.error("❌ Falló la reconexión:", err.message));
      }, 2000);
    }
  });

  for (const [eventName, pluginList] of events) {
    sock.ev.on(eventName, async (...args) => {
      for (const plugin of pluginList) {
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
// HANDLE MESSAGES
// ═══════════════════════════════════════════
async function handleMessages(sock, { messages, type }) {
  if (type !== "notify") return;
  vigilanteAntiban?.latido(); 
  global.__contadorMensajes = (global.__contadorMensajes || 0) + 1;
  const m = messages[0];
  if (!m.message || m.key.fromMe) return;

  ritmoAntiban?.anotarEntrante(m.key.remoteJid);

  const pulsado = botonPulsado(m);
  const deBoton = Boolean(pulsado?.id);

  let texto = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption;
  if (!texto && deBoton) texto = `${config.prefix[0]}${String(pulsado.id).trim()}`;
  if (!texto) return;

  const usedPrefix = config.prefix.find(p => texto.startsWith(p));

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
  
  if (deBoton) sock.sendMessage(from, { react: { text: "⚡", key: m.key } }).catch(() => {});

  const targetChat = esPrivado ? sender : from;
  const enviartexto = (txt) => sock.sendMessage(targetChat, { text: txt }, { quoted: esPrivado ? null : m });

  console.log(`💬 [${from}] ${texto} ${esPrivado ? "🔒 (Privado)" : ""}`);

  const plugin = commands.get(comando);
  if (!plugin) return;

  if (isGroup && global.db?.data?.chats?.[remoteJid]?.botApagado) {
    if (comando !== "bot" && comando !== "boton") return;
  }

  if (plugin.isOwner && !isOwnerCheck(sender, sock)) {
    return enviartexto("⚠️ Este comando es exclusivo de los Owners.");
  }

  if (plugin.isAdmin) {
    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");
    const autorizado = await esAdmin(sock, from, sender, isOwnerCheck(sender, sock));
    if (!autorizado) return enviartexto("⚠️ Solo los administradores pueden usar este comando.");
  }

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
    PREFIX: usedPrefix || config.prefix[0], 
    BOT_NAME, 
    config, 
    db: global.db.data,
    isOwnerCheck, startSubbot, stopSubbot, getActiveSubbots, restaurarSubbots, loadSubConfig, saveSubConfig, jidToNumber, getTargetFromMsg
  };

  try {
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