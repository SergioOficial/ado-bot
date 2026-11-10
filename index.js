// CREADOR: Jeferson Fernández ⚔️ Colab Sergio Gómez Gort

// 📦 IMPORTACIONES
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
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
const SUB_CONFIG_DIR = "./sub/SubConfigs";
const SUB_SESSION_DIR = "./sub/SubBots";
const activeSubbots = new Map();
const MAX_SUBBOTS = 4;

function ensureSubDirs() {
  if (!fs.existsSync(SUB_CONFIG_DIR)) fs.mkdirSync(SUB_CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(SUB_SESSION_DIR)) fs.mkdirSync(SUB_SESSION_DIR, { recursive: true });
}

function loadSubConfig(numero) {
  ensureSubDirs();
  const file = `${SUB_CONFIG_DIR}/subconfig_${numero}.json`;
  if (!fs.existsSync(file)) return { owners: [] };
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return { owners: [] }; }
}

function saveSubConfig(numero, cfg) {
  ensureSubDirs();
  fs.writeFileSync(`${SUB_CONFIG_DIR}/subconfig_${numero}.json`, JSON.stringify(cfg, null, 2));
}

function getActiveSubbots() { return activeSubbots; }

function jidToNumber(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}

function isOwnerCheck(jid, sockInstance) {
  const num = jidToNumber(jid);
  const botNum = jidToNumber(sockInstance?.user?.id || "");
  if (num === botNum) return true;
  if ((config.owners || []).some(o => String(o.number).replace(/\D/g, "") === num)) return true;
  if (sockInstance?.subconfig?.owners?.includes(num)) return true;
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
  try { fs.rmSync(`${SUB_SESSION_DIR}/${phoneNumber}`, { recursive: true, force: true }); } catch {}
  return true;
}

async function startSubbot(parentSock, senderJid, remoteJid, reply, method) {
  const phoneNumber = jidToNumber(senderJid);

  if (!phoneNumber || phoneNumber.length < 8 || phoneNumber.length > 15 || /^1\d{14}$/.test(phoneNumber)) {
    return reply(`❌ *Número inválido:* \`${phoneNumber}\`\n\nParece un LID.\n👉 Usa: *${config.prefix[0]}jadibot 5354386852*`);
  }

  if (activeSubbots.size >= MAX_SUBBOTS) {
    return reply(`⚠️ Límite de subbots alcanzado (${MAX_SUBBOTS}).`);
  }

  if (activeSubbots.has(phoneNumber)) {
    return reply(`⚠️ Ya tienes un subbot activo (${phoneNumber}).`);
  }

  const sessionPath = `./sub/${phoneNumber}`;
  if (!fs.existsSync("./sub")) fs.mkdirSync("./sub", { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestWaWebVersion();

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
          text: `> Levi-Bot✰\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ Cσԃҽ\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n✧ No es recomendable usar tu cuenta principal.`
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
const banner = cfonts.render("Levi|Bot", { font: "block", align: "center", gradient: ["cyan", "magenta"], lineHeight: 1, letterSpacing: 1, space: true, env: "node" });
const subBanner = cfonts.render("⚔️ by Jeferson Fernández 💫 from Sergio Gómez Gort", { font: "console", align: "center", gradient: ["yellow", "cyan"] });
console.clear();
console.log(banner.string);
console.log(subBanner.string);
console.log(color("💫 Levi-Bot se está iniciando...", "magenta"));

// 🧠 VARIABLES GLOBALES
const BOT_NAME = config.botName;

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
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📦 Usando versión de Baileys: ${version.join(".")} (${isLatest ? "actual" : "desactualizada"})`);

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
    logger: pino({ level: "silent" })
  });

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

    if (connection === "open") console.log(`✅ ${BOT_NAME} conectado correctamente.`);

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Sesión cerrada. Borra /session y reinicia.");
        process.exit(1);
      } else {
        console.log("♻️ Reconectando...");
        startLevi();
      }
    }
  });

  // 👇 AQUÍ REGISTRAMOS LOS EVENTOS DINÁMICOS
  for (const [eventName, pluginList] of events) {
    sock.ev.on(eventName, async (...args) => {
      for (const plugin of pluginList) {
        try {
          await plugin.execute(sock, ...args);
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
  const m = messages[0];
  if (!m.message || m.key.fromMe) return;

  const texto = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption;
  if (!texto) return;

  // 🔍 Detectar cuál de los prefijos del array se usó
  const usedPrefix = config.prefix.find(p => texto.startsWith(p));
  if (!usedPrefix) return; 

  const { remoteJid } = m.key;
  const isGroup = remoteJid.endsWith("@g.us");
  const from = remoteJid;
  const sender = getRealSender(m);

  // 🕵️‍♂️ LÓGICA DE PRIVACIDAD (Si el comando termina en '-')
  let textoLimpio = texto.slice(usedPrefix.length).trim();
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
  
  const targetChat = esPrivado ? sender : from;
  const enviartexto = (txt) => sock.sendMessage(targetChat, { text: txt }, { quoted: esPrivado ? null : m });

  console.log(`💬 [${from}] ${texto} ${esPrivado ? "🔒 (Privado)" : ""}`);

  const plugin = commands.get(comando);
  if (!plugin) return; 

  if (plugin.isOwner && !isOwnerCheck(sender, sock)) {
    return enviartexto("⚠️ Este comando es exclusivo de los Owners.");
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
    isOwnerCheck, startSubbot, stopSubbot, getActiveSubbots, loadSubConfig, saveSubConfig, jidToNumber, getTargetFromMsg
  };

  try {
    await plugin.execute(ctx);
  } catch (error) {
    console.error(`❌ Error en #${comando}:`, error);
    await enviartexto(`⚠️ Error en *${comando}*.\n_${error.message || error}_`);
  }
}

// 🚀 INICIAR
startLevi().catch((err) => {
  console.error("❌ Error fatal al iniciar:", err);
  process.exit(1);
});
