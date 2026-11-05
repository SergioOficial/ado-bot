// CREADOR: Jeferson Fernández ⚔️ Colab Sergio Gómez Gort

// 📦 IMPORTACIONES
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  downloadContentFromMessage,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import  sharp from "sharp";
import pino from "pino";
import readline from "readline";
import fs from "fs";
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import fetch from "node-fetch";
import chalk from "chalk";
import cfonts from "cfonts";
import { exec } from "child_process";
import { spawn } from "child_process";
import * as cheerio from "cheerio";
import path from "path";
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import './database.js'; 
global.loadDatabase();

// 🎨 HELPER DE COLOR
const color = (text, colorName = "green") => {
  try { return chalk[colorName](text); }
  catch { return chalk.green(text); }
};

// ═══════════════════════════════════════════
// SUBBOT MANAGER
// ═══════════════════════════════════════════
const SUB_CONFIG_DIR = "./Sessions/SubConfigs";
const SUB_SESSION_DIR = "./Sessions/SubBots";
const activeSubbots = new Map();
const MAX_SUBBOTS = 3;

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
  const ctxInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;
  const mentioned = ctxInfo?.mentionedJid?.[0];
  if (mentioned) return { jid: mentioned };
  if (ctxInfo?.participant) return { jid: ctxInfo.participant };
  const numArg = (argList || []).find(a => /^\d{8,15}$/.test(String(a).replace(/\D/g, "")));
  if (numArg) return { jid: `${String(numArg).replace(/\D/g, "")}@s.whatsapp.net` };
  return { jid: null };
}
const SESSION_FILE = "./Sessions/globalSession.json";
function isSessionEnabled() {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")).enabled !== false; }
  catch { return true; }
}
function setSessionEnabled(v) {
  if (!fs.existsSync("./Sessions")) fs.mkdirSync("./Sessions", { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ enabled: v }, null, 2));
}

async function getAudioFromApis(url) {
  // Si no tienes configurado global.APIs, aquí te dejo la estructura con las URLs públicas
  const APIs = {
    adonix: { url: 'https://api.adonix.com', key: 'Yuki-WaBot' },
    ootaizumi: { url: 'https://api.ootaizumi.com' },
    vreden: { url: 'https://api.vreden.my.id' },
    stellar: { url: 'https://api.stellarwa.xyz', key: 'YukiWaBot' },
    nekolabs: { url: 'https://api.nekolabs.com' }
  };

  const apis = [
    { api: 'Adonix', endpoint: `${APIs.adonix.url}/download/ytaudio?apikey=${APIs.adonix.key}&url=${encodeURIComponent(url)}`, extractor: res => res?.data?.url },    
    { api: 'Ootaizumi', endpoint: `${APIs.ootaizumi.url}/downloader/youtube/play?query=${encodeURIComponent(url)}`, extractor: res => res.result?.download },
    { api: 'Vreden', endpoint: `${APIs.vreden.url}/api/v1/download/youtube/audio?url=${encodeURIComponent(url)}&quality=256`, extractor: res => res.result?.download?.url },
    { api: 'Stellar', endpoint: `${APIs.stellar.url}/dl/ytmp3?url=${encodeURIComponent(url)}&quality=256&key=${APIs.stellar.key}`, extractor: res => res.data?.dl },
    { api: 'Ootaizumi v2', endpoint: `${APIs.ootaizumi.url}/downloader/youtube?url=${encodeURIComponent(url)}&format=mp3`, extractor: res => res.result?.download },
    { api: 'Vreden v2', endpoint: `${APIs.vreden.url}/api/v1/download/play/audio?query=${encodeURIComponent(url)}`, extractor: res => res.result?.download?.url },
    { api: 'Nekolabs', endpoint: `${APIs.nekolabs.url}/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=mp3`, extractor: res => res.result?.downloadUrl },
    { api: 'Nekolabs v2', endpoint: `${APIs.nekolabs.url}/downloader/youtube/play/v1?q=${encodeURIComponent(url)}`, extractor: res => res.result?.downloadUrl },
    { api: 'Allen Api', endpoint: `https://tester-web.onrender.com/api/download?url=${encodeURIComponent(url)}`, extractor: res => res.result?.downloadUrl }
  ];

  for (const { api, endpoint, extractor } of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(endpoint, { signal: controller.signal }).then(r => r.json());
      clearTimeout(timeout);
      const link = extractor(res);
      if (link) {
        console.log(`✅ Audio obtenido desde: ${api}`);
        return { url: link, api };
      }
    } catch (e) {
      // Ignorar errores y pasar a la siguiente API
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return null;
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

  // 🛑 Rechazar LIDs desde el inicio
  if (!phoneNumber || phoneNumber.length < 8 || phoneNumber.length > 15 || /^1\d{14}$/.test(phoneNumber)) {
    return reply(
      `❌ *Número inválido:* \`${phoneNumber}\`\n\n` +
      `Parece un LID (identificador interno de WhatsApp), no un teléfono real.\n\n` +
      `👉 Usa: *${PREFIX}jadibot 5354386852*`
    );
  }

  if (activeSubbots.size >= MAX_SUBBOTS) {
    return reply(`⚠️ Límite de subbots alcanzado (${MAX_SUBBOTS}). Detén uno con #stopbot.`);
  }

  if (activeSubbots.has(phoneNumber)) {
    return reply(`⚠️ Ya tienes un subbot activo (${phoneNumber}). Deténlo con #stopbot.`);
  }

  ensureSubDirs();
  const sessionPath = `${SUB_SESSION_DIR}/${phoneNumber}`;
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestWaWebVersion();

  const subSock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 120_000,
    keepAliveIntervalMs: 25_000
  });

  subSock.subconfig = loadSubConfig(phoneNumber);
  subSock.ev.on("creds.update", saveCreds);

  let pairingCodeRequested = false;

  subSock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (
      method === "code" &&
      !subSock.authState.creds.registered &&
      !pairingCodeRequested &&
      qr
    ) {
      pairingCodeRequested = true;
      await new Promise(r => setTimeout(r, 2000));
      try {
        const code = await subSock.requestPairingCode(phoneNumber);
        await parentSock.sendMessage(remoteJid, {
          text: `> Levi-Bot✰\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ Cσԃҽ\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n✧ No es recomendable usar tu cuenta principal.`
        });
        await new Promise(r => setTimeout(r, 800));
        await parentSock.sendMessage(remoteJid, { text: `\`\`\`\n${code}\n\`\`\`` });
      } catch (err) {
        pairingCodeRequested = false;
        console.error("Error parincode subbot:", err.message);
        await parentSock.sendMessage(remoteJid, { text: `❌ Error pidiendo parincode: ${err.message}` });
      }
    }

    if (connection === "open") {
      activeSubbots.set(phoneNumber, subSock);
      await parentSock.sendMessage(remoteJid, { text: `✅ *Sub-bot conectado*\n📱 ${phoneNumber}` });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      activeSubbots.delete(phoneNumber);
      pairingCodeRequested = false;
      if (reason === DisconnectReason.loggedOut) {
        await parentSock.sendMessage(remoteJid, { text: `❌ Sub-bot ${phoneNumber} cerró sesión.` });
      } else {
        console.log(`♻️ Subbot ${phoneNumber} cerrado (código ${reason}), no se reintenta automáticamente para evitar bucles.`);
      }
    }
  });

  subSock.ev.on("messages.upsert", (ev) => handleMessages(subSock, ev));
}

// 🧙 BANNER
const banner = cfonts.render("Levi|Bot", {
  font: "block",
  align: "center",
  gradient: ["cyan", "magenta"],
  lineHeight: 1,
  letterSpacing: 1,
  space: true,
  env: "node"
});
const subBanner = cfonts.render("⚔️ by Jeferson Fernández 💫 from Sergio Gómez Gort", {
  font: "console",
  align: "center",
  gradient: ["yellow", "cyan"]
});
console.clear();
console.log(banner.string);
console.log(subBanner.string);
console.log(color("💫 Levi-Bot se está iniciando...", "magenta"));

// 🧠 VARIABLES GLOBALES
const PREFIX = config.prefix;
const BOT_NAME = config.botName;
const OWNER_NAME = config.ownerName;
const OWNER_NUMBER = config.ownerNumber;
const VERSION = config.version;
const FOOTER = config.footer;

// 🧾 ASK (para Termux local)
function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(promptText, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function getRealSender(m) {
  const k = m.key || {};
  // Orden de preferencia: primero los "Pn" (Phone Number), luego los normales
  const candidates = [
    k.participantPn,
    k.senderPn,
    k.participantAlt,
    k.remoteJidPn,
    k.remoteJidAlt,
    k.participant,
    k.remoteJid
  ];
  for (const c of candidates) {
    if (!c) continue;
    const num = jidToNumber(c);
    // Si tiene 8-15 dígitos y NO es un LID (15 dígitos empezando por 1) → es válido
    if (num.length >= 8 && num.length <= 15 && !/^1\d{14}$/.test(num)) {
      return c;
    }
  }
  // Si ninguno sirve, devolver el participant/remoteJid original
  return k.participant || k.remoteJid;
}
// 🚀 START — SOLO CONEXIÓN
async function startLevi() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📦 Usando versión de Baileys: ${version.join(".")} (${isLatest ? "actual" : "desactualizada"})`);

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    logger: pino({ level: "silent" })
  });

  let pairingCodeRequested = false;
  let phoneNumber = null;

  if (!sock.authState.creds.registered) {
    phoneNumber = process.env.WHATSAPP_NUMBER || await ask("📱 Ingresa tu número de WhatsApp (ejemplo: 573001234567): ");
    if (!phoneNumber) {
      console.error("❌ Define WHATSAPP_NUMBER o ingresa el número manualmente.");
      process.exit(1);
    }
    console.log(`📱 Número configurado para vincular: ${phoneNumber}`);
  }

  sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (
    !sock.authState.creds.registered &&
    !pairingCodeRequested &&
    (connection === "connecting" || qr)
  ) {
    pairingCodeRequested = true;
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`\n> Levi-Bot✰\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ Cσԃҽ\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n✧ No es recomendable usar tu cuenta principal.\n`);
      console.log(`🔐 Tu código de vinculación es: ${code}`);
      console.log("➡️ WhatsApp → Dispositivos vinculados → Vincular con número.\n");
    } catch (err) {
      pairingCodeRequested = false;
      console.error("❌ Error al solicitar el parincode:", err.message);
    }
  }

  if (connection === "open") {
    console.log(`✅ ${BOT_NAME} conectado correctamente.`);
  }

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
sock.ev.on("messages.upsert", (ev) => handleMessages(sock, ev));
  return sock;
}

// ═══════════════════════════════════════════
// HANDLE MESSAGES — AQUÍ VA TODO EL SWITCH
// ═══════════════════════════════════════════
async function handleMessages(sock, { messages, type }) {
  if (type !== "notify") return;

  const m = messages[0];
  if (!m.message) return;
  if (m.key.fromMe) return;

  const texto =
    m.message.conversation ||
    m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption ||
    m.message.videoMessage?.caption;
  if (!texto) return;
  if (!texto.startsWith(PREFIX)) return;

const { remoteJid } = m.key;
const isGroup = remoteJid.endsWith("@g.us");
const from = remoteJid;
const sender = getRealSender(m);
  const args = texto.slice(PREFIX.length).trim().split(/\s+/);
  const comando = args.shift().toLowerCase();
  const enviartexto = (txt) => sock.sendMessage(from, { text: txt }, { quoted: m });

  console.log(`💬 [${from}] ${texto}`);
  console.log(`🧩 Comando detectado: ${comando}`);

  switch (comando) {

    case "menu":
    case "help": {
const numero = sender.split("@")[0];
      
      // La imagen que pediste
      const pfp = "https://i.postimg.cc/Y95RC8Jt/IMG-20261104-WA0014(1).jpg";

      const CANAL_JID = "120363415858789528@newsletter";
      const CANAL_URL = "https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d";
      const CANAL_NOMBRE = "⍪❖Ƭʜᴇ Kakashi—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
      const GRUPO = "https://chat.whatsapp.com/FAWaPaXIcbpLxpcq823WiE";
      const bannerMenu = `
🎄 ═══════ 🎅 ═══════ 🎄
> ❄️ *¡Hola!* @${numero} ❄️
    Soy 𝐋𝐄𝐕𝐈-𝐁𝐎𝐓 ☃️
  🎁 *Menú Navideño* 🎁

╭┈ࠢ͜┅͜─༻ 🎄 *𝐁𝐎𝐓 𝐈𝐍𝐅𝐎* 🎄 ༺─┅ࠢ͜┈
│ 💠 *Nombre:* ${BOT_NAME}
│ ⚙️ *Versión:* ${VERSION}
│ 👑 *Owner:* ${OWNER_NAME}
│ 👥 *Usuarios:* ${Object.keys(regix).length || "∞"}
│ 🧩 *Librería:* Baileys Multi Device
╰──────────────────────────────╯
`;

      const secciones = `
╭─ 🎁 *𝐂𝐎𝐈𝐍𝐒 / 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀* ❄️
│ 💵 ${PREFIX}work → Trabaja y gana coins
│ 🎅 ${PREFIX}daily → Reclama tus coins diarios
│ 💳 ${PREFIX}bal → Consulta tu balance
╰────────────────────────────╯

╭─ 🔔 *𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒* ⭐
│ 🏓 ${PREFIX}ping → Mide latencia
│ 🧪 ${PREFIX}prueba → Test de velocidad
│ ℹ️ ${PREFIX}info → Info del bot
│ 👑 ${PREFIX}creadores → Contactos de creadores
│ 📢 ${PREFIX}canal → Canal oficial
╰────────────────────────────╯

╭─ 🎄 *𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀* 🎨
│ 💵 ${PREFIX}work → Trabaja y gana coins
│ 🎁 ${PREFIX}daily → Reclama tus coins diarios
│ 💳 ${PREFIX}bal → Consulta tu balance
╰────────────────────────────╯

╭─ 🔔 *𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒* ⭐
│ 🏓 ${PREFIX}ping → Mide latencia
│ 🧪 ${PREFIX}prueba → Test de velocidad (preview)
│ ℹ️ ${PREFIX}info → Info del bot
│ 📢 ${PREFIX}canal → Canal oficial
│ 👑 ${PREFIX}creadores → Contactos de creadores
│ ♻️ ${PREFIX}fix → Actualizar bot (Owners)
╰────────────────────────────╯

╭─ ☃️ *𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒* 🖌️
│ 🎨 ${PREFIX}sticker / ${PREFIX}s → Crear sticker
│ 🖼️ ${PREFIX}brat <texto> → Sticker estilo Brat
│ 🔎 ${PREFIX}stickers <búsqueda> → Buscar packs
╰────────────────────────────╯

╭─ 🎄 *𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒* 🎨
│ 📌 ${PREFIX}pinterest <búsqueda>
│ 🎵 ${PREFIX}play <canción> → YouTube
│ 🔍 ${PREFIX}ytsearch <texto> → Buscar en YouTube
│ 🖼️ ${PREFIX}toimg → Sticker a imagen
╰────────────────────────────╯

╭─ ☃️ *𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋* 🧠
│ 🤖 ${PREFIX}ia <pregunta>
│ 💬 ${PREFIX}chatgpt <pregunta>
│ ⚡ ${PREFIX}gpt <pregunta>
╰────────────────────────────╯

╭─ 🌟 *𝐏𝐄𝐑𝐅𝐈𝐋𝐄𝐒* 🧾
│ 🧍 ${PREFIX}reg <nombre> <edad> <género>
│ 👤 ${PREFIX}perfil
│ 🗑️ ${PREFIX}eliminarperfil
╰────────────────────────────╯

╭─ ⚔️ *𝐀𝐕𝐄𝐍𝐓𝐔𝐑𝐀 𝐘 𝐑𝐏𝐆* 🏰
│ ✦ ${PREFIX}trabajar → Gana oro
│ ✦ ${PREFIX}cazar → Gana exp
│ ✦ ${PREFIX}perfilrpg
│ ✦ ${PREFIX}clase → guerrero/mago/arquero
│ ✦ ${PREFIX}reiniciarrpg
╰────────────────────────────╯

╭─ ⚙️ *𝐂𝐎𝐍𝐅𝐈𝐆 𝐃𝐄𝐋 𝐁𝐎𝐓* 🎅
│ 📛 ${PREFIX}setbotname <nombre>
│ 📝 ${PREFIX}setbotbio <texto>
│ 🖼️ ${PREFIX}setbotpp → Responde a imagen
│ 🎨 ${PREFIX}setboticono <emoji>
│ 🖼️ ${PREFIX}setbotlogo <url>
│ 💧 ${PREFIX}setbotwm <texto>
╰────────────────────────────╯

╭─ 🤖 *𝐒𝐔𝐁-𝐁𝐎𝐓𝐒* 🦌
│ 🚀 ${PREFIX}jadibot <número> → Crear subbot
│ 🛑 ${PREFIX}stopbot → Detener mi subbot
│ 📋 ${PREFIX}bots → Listar subbots activos
│ 👑 ${PREFIX}addowner → Añadir dueño
│ 🗑️ ${PREFIX}delowner → Quitar dueño
│ 🌐 ${PREFIX}botsesion on|off → Apagar global
╰────────────────────────────╯


╭─ 🎁 *𝐑𝐀𝐍𝐊𝐈𝐍𝐆𝐒* 🏆
│ ✦ ${PREFIX}rankcoins
│ ✦ ${PREFIX}ranknivel
╰────────────────────────────╯

╭─ 📩 *𝐒𝐎𝐏𝐎𝐑𝐓𝐄* 💌
│ 🐛 ${PREFIX}reporte <texto> → Reportar bug
│ 💡 ${PREFIX}sugerencia <texto> → Enviar idea
╰────────────────────────────╯

🎄 ═══════ 🎅 ═══════ 🎄
   🍪 *¡Feliz Navidad!* 🍪

📢 *Canal oficial:*
${CANAL_URL}

💬 *Grupo de soporte:*
${GRUPO}

=======
🕸️ ═══════ 🎃 ═══════ 🕸️
${FOOTER}
`;
// ✨ Se envía como texto, pero con la tarjeta (externalAdReply) y el "Ver canal"
      await sock.sendMessage(from, {
        text: bannerMenu + secciones,
        mentions: [sender],
        contextInfo: {
          // ── Tarjeta con la imagen ──
          externalAdReply: {
            title: '🎄 Levi-Bot — Menú Navideño',
            body: 'Toca aquí para ver el canal oficial',
            thumbnailUrl: pfp,
            sourceUrl: CANAL_URL,
            mediaType: 1,
            showAdAttribution: false,
            renderLargerThumbnail: true
          },
          // ── Botón "Ver canal" ──
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: CANAL_JID,
            newsletterName: CANAL_NOMBRE,
            serverMessageId: 1
          }
        }
      }, { quoted: m });

      break;
    }
// ═══════════════════════════════════════════
// PRUEBA / PBA — Ping con preview y Ver Canal
// ═══════════════════════════════════════════
case "prueba":
case "pba": {
  const { performance } = await import("perf_hooks");

  const CANAL_JID = "120363415858789528@newsletter";
  const CANAL_NOMBRE = "⍪❖Ƭʜᴇ Kakashi—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";

  const start = performance.now();

  // 1. Reacción
  await sock.sendMessage(from, {
    react: { text: "🌿", key: m.key }
  });

  const end = performance.now();
  const latencia = (end - start).toFixed(3);

  const pingMsg = `ׄ ⋆ ⚙🌿 ̊. *𝐏𝐎𝐍𝐆*\n> ʚଓ 𝙑𝙚𝙡𝙤𝙘𝙞𝙙𝙖𝙙: *${latencia}* ms`;

  // 2. Mensaje con tarjeta (externalAdReply) Y Ver Canal (forwarded)
  await sock.sendMessage(from, {
    text: pingMsg,
    contextInfo: {
      // ── Tarjeta con imagen y título ──
      externalAdReply: {
        title: 'Ping test ಥ⁠‿⁠ಥ',
        body: `Latencia: ${latencia}ms`,
        thumbnailUrl: "https://i.postimg.cc/Y95RC8Jt/IMG-20261104-WA0014(1).jpg",
        sourceUrl: 'https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d', // Tu canal real
        mediaType: 1,
        showAdAttribution: true,
        renderLargerThumbnail: false
      },
      // ── "Ver canal" al pie ──
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: CANAL_JID,
        newsletterName: CANAL_NOMBRE,
        serverMessageId: 1
      }
    }
  }, { quoted: m });

  break;
}
    // ═══════════════════════════════════════════
    // CREADORES
    // ═══════════════════════════════════════════
    case "creadores":
    case "creators":
    case "owners": {
      const owners = config.owners || [];
      if (!owners.length) return enviartexto("❌ No hay creadores configurados.");

      const buildVCard = (name, number) => {
        const cleanNumber = String(number).replace(/[^\d]/g, "");
        return [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${name}`,
          `ORG:${BOT_NAME};`,
          `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}`,
          "END:VCARD"
        ].join("\n");
      };

      const contacts = owners.map(o => ({ vcard: buildVCard(o.name, o.number) }));

      try {
        await sock.sendMessage(from, {
          contacts: {
            displayName: owners.length > 1 ? `${owners.length} Creadores` : owners[0].name,
            contacts
          }
        }, { quoted: m });
      } catch (err) {
        console.error("[Creadores] Error:", err.message);
        const fallback = owners
          .map(o => `👑 *${o.name}* — wa.me/${String(o.number).replace(/[^\d]/g, "")}`)
          .join("\n");
        await enviartexto(`*CREADORES DEL BOT*\n\n${fallback}`);
      }
      break;
    }
// ═══════════════════════════════════════════
// REPORTE / SUGERENCIA → GitHub Issues
// ═══════════════════════════════════════════
case "reporte":
case "report":
case "sugerencia":
case "sugerir": {
  const textoReporte = args.join(" ").trim();

  if (!textoReporte) {
    return enviartexto(
      `❌ *Uso:*\n` +
      `• ${PREFIX}reporte <descripción del problema>\n` +
      `• ${PREFIX}sugerencia <idea o mejora>\n\n` +
      `Ejemplo: ${PREFIX}reporte El comando #play no descarga audio`
    );
  }

  // 🔐 Verificar que el token esté configurado
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error("[Reporte] GITHUB_TOKEN no configurado");
    return enviartexto(
      `⚠️ El sistema de reportes no está disponible.\n\n` +
      `_Falta configurar_ \`GITHUB_TOKEN\` _en el servidor._`
    );
  }

  const GITHUB_OWNER = process.env.GITHUB_OWNER || "SergioOficial";
  const GITHUB_REPO = process.env.GITHUB_REPO || "reportes-bot";

  const usuario = m.pushName || "Anónimo";
  const numero = jidToNumber(sender);
  const fecha = new Date().toISOString().replace("T", " ").slice(0, 19);
  const tipo = comando === "sugerencia" || comando === "sugerir" ? "💡 Sugerencia" : "📩 Reporte";

  await sock.sendMessage(from, { react: { text: "📤", key: m.key } });
  const waitMsg = await sock.sendMessage(from, { text: `📤 Enviando reporte al sitio...` }, { quoted: m });

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Levi-Bot"
        },
        body: JSON.stringify({
          title: `${tipo} de ${usuario}`,
          body:
            `### ${tipo}\n\n` +
            `${textoReporte}\n\n` +
            `---\n` +
            `**👤 Usuario:** ${usuario}\n` +
            `**📱 Número:** +${numero}\n` +
            `**📅 Fecha:** ${fecha}\n` +
            `**🤖 Bot:** ${BOT_NAME} v${VERSION}\n` +
            `**🔍 Comando:** \`${comando}\``
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const issue = await res.json();

    await sock.sendMessage(from, {
      text: issue.html_url,
      edit: waitMsg.key
    }).catch(async () => {
      // Si edit falla, envía como nuevo mensaje
      await enviartexto(`✅ *Reporte enviado correctamente.*\n🔗 ${issue.html_url}`);
    });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("[Reporte] Error:", err.message);
    try {
      await sock.sendMessage(from, {
        text: `❌ No se pudo enviar el reporte.\n_${err.message}_`,
        edit: waitMsg.key
      });
    } catch {
      await enviartexto(`❌ No se pudo enviar el reporte. Intenta más tarde.`);
    }
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
  }

  break;
}

// ═══════════════════════════════════════════
// FIX / UPDATE — Actualizar desde GitHub
// ═══════════════════════════════════════════
case "fix":
case "update": {
  // Solo el owner puede usarlo
  if (!isOwnerCheck(sender, sock)) {
    return enviartexto("⚠️ Solo el dueño del bot puede usar este comando.");
  }

  await enviartexto("⏳ *Buscando actualizaciones en GitHub...*");

  // Ejecutar git pull en la carpeta actual
  exec("git pull", async (error, stdout, stderr) => {
    if (error) {
      console.error(`[Update] Error de Git:`, error);
      return enviartexto(`❌ *Error al actualizar:*\n_${error.message}_`);
    }

    const output = stdout.trim();

    if (output.includes("Already up to date.") || output.includes("Ya está actualizado.")) {
      return enviartexto("ꕥ *Estado:* Todo está actualizado. No hay cambios nuevos.");
    }

    await enviartexto(
      `✅ *Actualización completada:*\n\n` +
      `\`\`\`\n${output}\n\`\`\`\n\n` +
      `♻️ *Reiniciando el bot para aplicar los cambios...*`
    );

    // 🔄 Reiniciar el proceso después de 3 segundos
    setTimeout(() => {
      console.log("♻️ Reiniciando el bot tras actualización desde GitHub...");
      process.exit(0); // Sale del proceso. BotKeep lo reiniciará solo.
    }, 3000);
  });

  break;
}
    // ═══════════════════════════════════════════
    // PING
    // ═══════════════════════════════════════════
    case "ping":
    case "p": {
      const start = Date.now();
      const sent = await sock.sendMessage(from, { text: "🏓 Calculando..." }, { quoted: m });
      const latency = Date.now() - start;
      await sock.sendMessage(from, {
        text:
          ` *✰ ¡Pong!* \n\n` +
          `> *Tiempo ⴵ*  ${latency} ms`,
        edit: sent.key
      });
      break;
    }

    // ═══════════════════════════════════════════
    // INFO
    // ═══════════════════════════════════════════
    case "info": {
      await enviartexto(
        `🤖 *${BOT_NAME}*\n📦 Versión: ${VERSION}\n👑 Owner: ${OWNER_NAME}\n📱 wa.me/${OWNER_NUMBER}\n\n${FOOTER}`
      );
      break;
    }

    // ═══════════════════════════════════════════
    // TOIMG
    // ═══════════════════════════════════════════
    case "toimg":
    case "s2i":
    case "sticker2img":
    case "img": {
      const quoted =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        m.message?.imageMessage?.contextInfo?.quotedMessage ||
        m.message?.videoMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return enviartexto(
          `❌ *Uso:*\n1️⃣ Envía o recibe un sticker\n2️⃣ Respóndele con *${PREFIX}toimg*`
        );
      }
      const stickerMsg = quoted.stickerMessage;
      if (!stickerMsg) return enviartexto("❌ El mensaje citado no es un sticker.");
      if (stickerMsg.isAnimated) return enviartexto("❌ Los stickers animados no se pueden convertir.");

      await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
      try {
        const buffer = await downloadMediaMessage(
          { key: m.key, message: quoted },
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage }
        );
        if (!buffer || buffer.length === 0) throw new Error("Buffer vacío");
        const pngBuffer = await sharp(buffer).png({ quality: 100 }).toBuffer();
        await sock.sendMessage(from, {
          image: pngBuffer,
          caption: `🖼️ *Sticker convertido a imagen*\n\n${FOOTER}`,
          mimetype: "image/png"
        }, { quoted: m });
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      } catch (err) {
        console.error("Error en #toimg:", err);
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        await enviartexto(`⚠️ No se pudo convertir.\n_${err.message}_`);
      }
      break;
    }

// ═══════════════════════════════════════════
// STICKER AVANZADO — Formas, efectos y metadatos
// ═══════════════════════════════════════════
case "sticker":
case "s": {
  const ensureTmp = () => { if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true }); };
  const tmp = (name) => path.join('./tmp', name);
  
  const runFfmpeg = (cmdArgs) => new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => code === 0 ? resolve(true) : reject(new Error(err)));
  });

  ensureTmp();

  // Lista de ayuda
  if (args[0] === "-list") {
    return enviartexto(
      `ꕥ Lista de Formas y Efectos Disponibles:\n\n` +
      `✦ Formas:\n- -c : Circular\n- -t : Triángulo\n- -s : Estrella\n- -r : Esquinas redondeadas\n- -h : Hexágono\n- -d : Diamante\n- -f : Marco\n- -b : Borde\n- -w : Onda\n- -m : Espejado\n- -o : Octogonal\n- -y : Pentagonal\n- -e : Elíptico\n- -z : Cruz\n- -v : Corazón\n\n` +
      `✧ Efectos:\n- -blur : Desenfoque\n- -sepia : Sepia\n- -sharpen : Nitidez\n- -brighten : Brillo\n- -darken : Oscurecer\n- -invert : Invertir\n- -grayscale : Escala de grises\n- -rotate90 : Rotar 90°\n- -flip : Espejo H\n- -flop : Espejo V\n- -negate : Negativo\n\n` +
      `> Ejemplo: ${PREFIX}s -c -blur Mi Pack • Mi Nombre`
    );
  }

  // Función para parsear los flags
  const parseArgs = (argList) => {
    const shapeArgs = { '-c': 'circle', '-t': 'triangle', '-s': 'star', '-r': 'roundrect', '-h': 'hexagon', '-d': 'diamond', '-f': 'frame', '-b': 'border', '-w': 'wave', '-m': 'mirror', '-o': 'octagon', '-y': 'pentagon', '-e': 'ellipse', '-z': 'cross', '-v': 'heart' };
    const effectArgs = { '-blur': 'blur', '-sepia': 'sepia', '-sharpen': 'sharpen', '-brighten': 'brighten', '-darken': 'darken', '-invert': 'invert', '-grayscale': 'grayscale', '-rotate90': 'rotate90', '-rotate180': 'rotate180', '-flip': 'flip', '-flop': 'flop', '-normalice': 'normalise', '-negate': 'negate' };
    
    const picked = [];
    const rest = [];
    for (const a of argList) {
      if (shapeArgs[a]) picked.push({ type: 'shape', value: shapeArgs[a] });
      else if (effectArgs[a]) picked.push({ type: 'effect', value: effectArgs[a] });
      else rest.push(a);
    }
    
    const filteredText = rest.join(' ').trim();
    const marca = filteredText.split(/[\u2022|]/).map((s) => s.trim()).filter(Boolean);
    return { picked, marca };
  };

  const buildVF = (picked) => {
    const W = 512, H = 512;
    const shape = picked.find((x) => x.type === 'shape')?.value || null;
    const effects = picked.filter((x) => x.type === 'effect').map((x) => x.value);
    const vf = [];

    vf.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`);
    vf.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
    vf.push('format=rgba');

    for (const e of effects) {
      if (e === 'blur') vf.push('gblur=sigma=6:steps=2');
      else if (e === 'sepia') vf.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
      else if (e === 'sharpen') vf.push('unsharp=5:5:1.2:5:5:0.0');
      else if (e === 'brighten') vf.push('eq=brightness=0.08');
      else if (e === 'darken') vf.push('eq=brightness=-0.10');
      else if (e === 'invert' || e === 'negate') vf.push('negate');
      else if (e === 'grayscale') vf.push('hue=s=0');
      else if (e === 'rotate90') vf.push('transpose=1');
      else if (e === 'rotate180') vf.push('rotate=PI');
      else if (e === 'flip') vf.push('hflip');
      else if (e === 'flop') vf.push('vflip');
    }

    if (shape === 'mirror') vf.push('hflip');
    if (shape === 'border') vf.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.90:t=14`);
    if (shape === 'frame') vf.push(`drawbox=x=18:y=18:w=${W - 36}:h=${H - 36}:color=white@0.55:t=10`);

    const cx = `${W}/2`, cy = `${H}/2`, minwh = `min(${W},${H})`, r = `(${minwh}/2)`;
    const clamp255 = (expr) => `if(${expr},255,0)`;

    const alphaExpr = (() => {
      if (!shape || ['cover','contain','mirror','border','frame'].includes(shape)) return null;
      if (shape === 'circle') return clamp255(`lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),(${r}-6)*(${r}-6))`);
      if (shape === 'diamond') return clamp255(`lte(abs(X-${cx})+abs(Y-${cy}),(${r}-6))`);
      if (shape === 'triangle') {
        const topY = `${H}*0.08`, botY = `${H}*0.94`;
        return clamp255(`gte(Y,${topY})*lte(Y,${botY})*lte(abs(X-${cx}), ((${botY}-Y)*0.58))`);
      }
      // Formas complejas omitidas por brevedad, pero puedes añadir la lógica del original aquí.
      return null;
    })();

    if (alphaExpr) vf.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`);
    vf.push('format=yuva420p');
    return vf.join(',');
  };

  const { picked, marca } = parseArgs(args);
  const pack = marca[0] || BOT_NAME;
  const author = marca.length > 1 ? marca[1] : OWNER_NAME;

  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
    const isImage = quoted.imageMessage;
    const isVideo = quoted.videoMessage;
    const isWebp = quoted.stickerMessage;

    if (!isImage && !isVideo && !isWebp) {
      return enviartexto(`《✧》 Por favor, responde a una imagen o video para hacer un sticker.\n> Usa *${PREFIX}s -list* para ver formas y efectos.`);
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    const buffer = await downloadMediaMessage(
      { key: m.key, message: quoted },
      "buffer",
      {},
      { logger: pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage }
    );

    if (isVideo) {
      // Si es video, usamos wa-sticker-formatter directamente (no soporta efectos ffmpeg aquí)
      const sticker = new Sticker(buffer, { pack, author, type: 'full', quality: 70 });
      await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
    } else {
      // Si es imagen o webp estático, aplicamos los filtros de ffmpeg
      const inFile = tmp(`in-${Date.now()}.png`);
      const outFile = tmp(`out-${Date.now()}.webp`);
      fs.writeFileSync(inFile, buffer);

      const vf = buildVF(picked);
      await runFfmpeg(['-y', '-i', inFile, '-vf', vf, '-an', '-fps_mode', 'passthrough', '-loop', '0', '-c:v', 'libwebp', '-preset', 'picture', '-compression_level', '6', '-q:v', '70', outFile]);

      const webpBuffer = fs.readFileSync(outFile);
      const sticker = new Sticker(webpBuffer, { pack, author, type: 'full', quality: 100 });
      
      await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });

      fs.unlinkSync(inFile);
      fs.unlinkSync(outFile);
    }

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  } catch (e) {
    console.error("Error en sticker:", e);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    await enviartexto(`> Error al crear el sticker.\n> [Error: *${e.message}*]`);
  }
  break;
}
// ═══════════════════════════════════════════
// STICKERS SEARCH — Buscar packs en GetStickerPack
// ═══════════════════════════════════════════
case "stickers":
case "searchsticker": {
  const raw = args.join(' ').trim();
  if (!raw) return enviartexto('《✧》 Por favor, ingresa el nombre de los *stickers* a buscar.');

  const ensureTmp = () => { if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true }); };
  ensureTmp();

  try {
    const parts = raw.split('|').map(x => x.trim()).filter(Boolean);
    const query = parts[0];
    const packname = parts[1] || BOT_NAME;
    const author = parts[2] || OWNER_NAME;

    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });

    // 1. Buscar packs
    const searchRes = await fetch(`https://getstickerpack.com/stickers?query=${encodeURIComponent(query)}`);
    const searchHtml = await searchRes.text();
    const $ = cheerio.load(searchHtml);

    const packs = [];
    $('.sticker-pack-cols a').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      let href = $(el).attr('href');
      if (title && href) {
        if (!href.startsWith('http')) href = 'https://getstickerpack.com' + href;
        packs.push({ title, url: href });
      }
    });

    if (!packs.length) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto('《✧》 No se encontraron resultados.');
    }

    const pack = packs[0];
    await enviartexto(`《✧》 Enviando *stickers* del pack: _*${pack.title}*_`);

    // 2. Obtener stickers del pack
    const packRes = await fetch(pack.url);
    const packHtml = await packRes.text();
    const $pack = cheerio.load(packHtml);
    const links = [];

    $pack('img.sticker-image').each((_, el) => {
      let src = $pack(el).attr('data-src-large') || $pack(el).attr('src');
      if (src) {
        if (!src.startsWith('http')) src = 'https://getstickerpack.com' + src;
        links.push(src);
      }
    });

    if (!links.length) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto('《✧》 El pack no contiene stickers.');
    }

    // 3. Descargar y enviar (límite de 5)
    const limit = 5;
    for (let i = 0; i < Math.min(links.length, limit); i++) {
      try {
        const imgRes = await fetch(links[i], { headers: { Referer: 'https://getstickerpack.com' } });
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        if (!buffer || buffer.length === 0) continue;

        const sticker = new Sticker(buffer, { pack: packname, author, type: 'full', quality: 70 });
        await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
        
        await new Promise(r => setTimeout(r, 1000)); // Pequeña pausa para no saturar
      } catch (e) {
        console.error("Error en sticker individual:", e);
      }
    }

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error("Error en stickers:", e);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    await enviartexto(`> Error: ${e.message}`);
  }
  break;
}

// ═══════════════════════════════════════════
// BRAT — Sticker estilo "Brat" (texto)
// ═══════════════════════════════════════════
case "brat": {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchSticker = async (txt, attempt = 1) => {
    try {
      const res = await fetch(`https://skyzxu-brat.hf.space/brat?text=${encodeURIComponent(txt)}`);
      
      if (res.status === 429 && attempt <= 3) {
        const retryAfter = res.headers.get('retry-after') || 5;
        await delay(retryAfter * 1000);
        return fetchSticker(txt, attempt + 1);
      }
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (attempt <= 3) {
        await delay(3000);
        return fetchSticker(txt, attempt + 1);
      }
      throw error;
    }
  };

  // 1. Obtener el texto (de los argumentos o del mensaje citado)
  let textoBrat = args.join(" ").trim();
  if (!textoBrat) {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      textoBrat = quoted.conversation || quoted.extendedTextMessage?.text;
    }
  }

  if (!textoBrat) {
    return enviartexto('《✧》 Por favor, responde a un mensaje o ingresa un texto para crear el Sticker.');
  }

  await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

  try {
    // 2. Descargar la imagen desde la API
    const buffer = await fetchSticker(textoBrat);

    // 3. Convertir a sticker con wa-sticker-formatter
    const sticker = new Sticker(buffer, {
      pack: BOT_NAME,
      author: OWNER_NAME,
      type: 'full', // Ajusta al tamaño sin recortar
      quality: 70
    });

    const stickerBuffer = await sticker.toBuffer();

    // 4. Enviar el sticker
    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "✔️", key: m.key } });

  } catch (e) {
    console.error("Error en #brat:", e);
    await sock.sendMessage(from, { react: { text: "✖️", key: m.key } });
    await enviartexto(`> Ocurrió un error al crear el sticker de brat.\n> [Error: *${e.message}*]`);
  }

  break;
}

    // ═══════════════════════════════════════════
    // IA
    // ═══════════════════════════════════════════
    case "ia":
    case "chatgpt":
    case "gpt": {
      const text = args.join(" ").trim();
      if (!text) {
        return enviartexto(
          `✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\n\nEjemplo: ${PREFIX}ia ¿Qué es el amor?`
        );
      }
      const username = m.pushName || "Usuario";
      const basePrompt =
        `Eres Levi-Bot, un asistente creado por Jeferson Fernandez en colaboración con Sergio Gomez Gort. ` +
        `Responde claro y creativo. Pregunta: ${text}`;

      const waitMsg = await sock.sendMessage(from, { text: `⏳ *${BOT_NAME}* está pensando...` }, { quoted: m });
      try {
        let responseText = null;
        try {
          const res = await fetch("https://ai.siputzx.my.id", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text, user: username, prompt: basePrompt, webSearchMode: false })
          });
          const json = await res.json();
          responseText = json?.result;
        } catch (err) { console.error("Error siputzx:", err.message); }

        if (!responseText) {
          try {
            const url = `https://api.stellarwa.xyz/ai/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(basePrompt)}&key=YukiWaBot`;
            const res = await fetch(url);
            const json = await res.json();
            if (json?.result?.text) responseText = json.result.text;
            else if (json?.result) responseText = json.result;
            else if (json?.results) responseText = json.results;
          } catch (err) { console.error("Error stellar:", err.message); }
}
   if (!responseText) {
          return sock.sendMessage(from, { text: "❌ No se pudo obtener respuesta.", edit: waitMsg.key });
        }
        await sock.sendMessage(from, { text: `${responseText.trim()}\n\n${FOOTER}`, edit: waitMsg.key });
      } catch (error) {
        console.error("Error en #ia:", error);
        try {
          await sock.sendMessage(from, { text: `⚠️ Error: ${error.message}`, edit: waitMsg.key });
        } catch {}
      }
      break;
    }

    case "reg": {
      const [nombre, edad, genero] = args;
      if (!nombre || !edad || !genero) return enviartexto(`⚔️ Ejemplo: ${PREFIX}reg Levi 22 M`);

      // Inicializar usuario si no existe
      if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
      const user = global.db.data.users[sender];

      if (user.nombre) return enviartexto("⚠️ Ya estás registrado.");

      const fecha = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
      const numero = sender.split("@")[0];

      // Guardar datos (la base de datos se guardará sola luego)
      user.id = sender;
      user.numero = numero;
      user.nombre = nombre;
      user.edad = edad;
      user.genero = genero.toUpperCase();
      user.fecha = fecha;

      const textoReg = `
╭─╼┈━༻ ⚔️ *REGISTRO COMPLETADO* ⚔️ ༺━┈╾─╮
│  ✨ *Bienvenido @${numero}*
│  💬 *Nombre:* ${nombre}
│  🎂 *Edad:* ${edad}
│  ⚧ *Género:* ${genero.toUpperCase()}
│  📅 *Fecha:* ${fecha}
╰────────────────────────────╯
${FOOTER}`.trim();

      await sock.sendMessage(from, { text: textoReg, mentions: [sender] }, { quoted: m });
      break;
    }
    // ═══════════════════════════════════════════
    // ELIMINAR PERFIL
    // ═══════════════════════════════════════════
    case "eliminarperfil": {
      if (!regix[sender]) return enviartexto("🍒 No estás registrado.");
      delete regix[sender];
      dowani();
      await sock.sendMessage(from, {
        text: `🫐 @${sender.split("@")[0]}, tu perfil ha sido eliminado.`,
        mentions: [sender]
      }, { quoted: m });
      break;
    }
case "trabajar": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];

  const now = Date.now();
  const cooldown = 5 * 60 * 1000; // 5 minutos

  if (now - (user.lastWork || 0) < cooldown) {
    const remain = cooldown - (now - user.lastWork);
    const minutos = Math.floor(remain / 60000);
    const segundos = Math.floor((remain % 60000) / 1000);
    return enviartexto(`⌛ Vuelve en *${minutos}m ${segundos}s*.`);
  }

  const trabajos = ["mercader", "forjador", "aventurero", "alquimista", "minero", "vigilante", "cazador", "mago"];
  const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
  const suerte = Math.random();

  let mensajeResultado = "";

  if (suerte < 0.7) {
    const oroGanado = Math.floor(Math.random() * 35000) + 250000;
    const expGanada = Math.floor(Math.random() * 50) + 25;
    user.oro = (user.oro || 0) + oroGanado;
    user.exp = (user.exp || 0) + expGanada;
    mensajeResultado = `✨ *Buen trabajo como ${trabajo}.*\nGanaste *¥${oroGanado.toLocaleString()}* y *${expGanada} exp.*`;
  } else {
    const perdida = Math.floor(Math.random() * 20000) + 5000;
    const expGanada = Math.floor(Math.random() * 10) + 5;
    user.oro = Math.max(0, (user.oro || 0) - perdida);
    user.exp = (user.exp || 0) + expGanada;
    mensajeResultado = `💢 *Trabajo fallido como ${trabajo}...*\nPerdiste *¥${perdida.toLocaleString()}* y ganaste *${expGanada} exp.*`;
  }

  user.lastWork = now;

  await enviartexto(
    `${mensajeResultado}\n\n💰 Balance: *¥${(user.oro || 0).toLocaleString()}*\n🏷️ Nivel: *${user.nivel || 1}*\n${FOOTER}`
  );
  break;
}

case "daily":
case "diario": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const timeSinceLast = now - (user.lastDaily || 0);

  if (timeSinceLast < DAY) {
    const remain = DAY - timeSinceLast;
    const h = Math.floor(remain / 3600000);
    const mi = Math.floor((remain % 3600000) / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    return enviartexto(`《✧》Ya reclamaste hoy. Vuelve en *${h}h ${mi}m ${s}s* ⏳`);
  }

  const missed = timeSinceLast > DAY * 2;
  user.streak = missed ? 1 : (user.streak || 0) + 1;
  
  const BASE = 30000;
  const BONUS = 1 + 0.15 * (user.streak - 1);
  const reward = Math.floor(BASE * BONUS);

  user.coins = (user.coins || 0) + reward;
  user.lastDaily = now;

  const next = Math.floor(BASE * (1 + 0.15 * user.streak));
  
  await enviartexto(
    `「✿」*Recompensa Diaria*\n\n🔥 ¡Reclamado *¥${reward.toLocaleString()}*! (Día *${user.streak}*)\n> Día *${user.streak + 1}* » *+¥${next.toLocaleString()}*\n\n💰 Balance: *¥${user.coins.toLocaleString()}*\n${FOOTER}`
  );
  break;
}

    case "perfil": {
      const user = global.db.data.users[sender];
      if (!user || !user.nombre) return enviartexto(`❗ No estás registrado. Usa ${PREFIX}reg`);

      let pfp;
      try { pfp = await sock.profilePictureUrl(sender, "image"); }
      catch { pfp = "https://i.postimg.cc/Y95RC8Jt/IMG-20261104-WA0014(1).jpg"; }

      const nivelMaxXP = (user.nivel || 1) * 100;
      const progreso = Math.min(10, Math.floor(((user.exp || 0) / nivelMaxXP) * 10));
      const barraXP = "▰".repeat(progreso) + "▱".repeat(10 - progreso);

      const textoPerfil = `
╭─╼┈━༻ 💫 *TU PERFIL - ${BOT_NAME}* 💫 ༺━┈╾─╮
│ 👤 *Nombre:* ${user.nombre}
│ 🎂 *Edad:* ${user.edad}
│ ⚧ *Género:* ${user.genero}
│ 📅 *Registro:* ${user.fecha}
╰────────────────────────────╯

╭─╼┈━༻ ⚔️ *RPG STATS* ⚔️ ༺━┈╾─╮
│ 🎭 *Clase:* ${user.clase || "Novato"}
│ 💥 *Nivel:* ${user.nivel || 1}
│ ✨ *Experiencia:* ${user.exp || 0}/${nivelMaxXP}
│ 🔋 *Progreso:* ${barraXP}
│ 💰 *Coins:* ${user.coins || user.oro || 0} 🪙
╰────────────────────────────╯
${FOOTER}`.trim();

      await sock.sendMessage(from, { image: { url: pfp }, caption: textoPerfil, mentions: [sender] }, { quoted: m });
      break;
    }

case "cazar": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];

  const expGanada = Math.floor(Math.random() * 40) + 10;
  user.exp = (user.exp || 0) + expGanada;
  user.nivel = user.nivel || 1;

  if (user.exp >= (user.nivel * 100)) {
    user.nivel++;
    user.exp -= (user.nivel - 1) * 100; // Restar el XP del nivel anterior
    await enviartexto(`⚡ *¡Subiste al nivel ${user.nivel}!* 🥳\n${FOOTER}`);
  } else {
    await enviartexto(`🏹 *Cazaste un monstruo y ganaste ${expGanada} exp.* ⭐\n${FOOTER}`);
  }
  break;
}
case "reiniciarrpg": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];

  // Borramos solo las stats RPG, mantenemos el perfil (nombre, edad)
  user.oro = 0;
  user.exp = 0;
  user.nivel = 1;
  user.clase = "Novato";

  await enviartexto("♻️ *Tu progreso RPG ha sido reiniciado.*");
  break;
}

case "clase": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];

  const opciones = ["guerrero", "mago", "arquero"];
  const eleccion = args[0]?.toLowerCase();

  if (!eleccion) return enviartexto(`🎭 *Elige:*\n\n⚔️ ${PREFIX}clase guerrero\n🔮 ${PREFIX}clase mago\n🏹 ${PREFIX}clase arquero`);
  if (!opciones.includes(eleccion)) return enviartexto("❌ Clase inválida.");

  user.clase = eleccion.charAt(0).toUpperCase() + eleccion.slice(1);

  const desc = {
    guerrero: "⚔️ *Guerrero:* Fuerte y valiente.",
    mago: "🔮 *Mago:* Sabio y poderoso.",
    arquero: "🏹 *Arquero:* Rápido y preciso."
  };
  await enviartexto(`✨ Elegiste: *${user.clase}*\n\n${desc[eleccion]}`);
  break;
}

case "coins":
case "balance":
case "bal": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];
  
  const coins = user.coins || user.oro || 0;
  const nivel = user.nivel || 1;
  const exp = user.exp || 0;

  const mensaje = `╭───「 *💰 Balance* 」\n│ 💳 @${sender.split("@")[0]}\n│ 🏅 Nivel: ${nivel}\n│ 📈 Exp: ${exp.toLocaleString()}\n│ 💎 Riqueza: ¥${coins.toLocaleString()}\n╰───────────────────────\n${FOOTER}`;
  
  await sock.sendMessage(from, { text: mensaje, mentions: [sender] }, { quoted: m });
  break;
}

case "work": 
case "w": {
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const user = global.db.data.users[sender];

  const now = Date.now();
  const cooldown = 5 * 60 * 1000;

  if (now - (user.lastWork || 0) < cooldown) {
    const remain = cooldown - (now - user.lastWork);
    const min = Math.floor(remain / 60000);
    const seg = Math.floor((remain % 60000) / 1000);
    return enviartexto(`⏳ Vuelve en *${min}m ${seg}s* 🔔`);
  }

  const suerte = Math.random();
  let mensaje;

  if (suerte < 0.7) {
    const reward = Math.floor(Math.random() * 35000) + 35000;
    user.coins = (user.coins || 0) + reward;
    mensaje = `✿ Trabajaste duro y ganaste *¥${reward.toLocaleString()} coins 💷*`;
  } else {
    const reward = Math.floor(Math.random() * 20000) + 5000;
    user.coins = Math.max(0, (user.coins || 0) - reward);
    mensaje = `💢 Perdiste *¥${reward.toLocaleString()} coins 💷*`;
  }

  user.lastWork = now;

  await enviartexto(`「✿」${mensaje}\n> 💰 Balance: *¥${(user.coins || 0).toLocaleString()}*\n${FOOTER}`);
  break;
}
// ═══════════════════════════════════════════
// RANKCOINS
// ═══════════════════════════════════════════
case "rankcoins": {
  if (isGroup) {
    const meta = await sock.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    if (!admins.includes(sender)) return enviartexto("⚠️ Solo administradores del grupo.");
  }

  const users = global.db.data.users;
  const ranking = Object.entries(users)
    .map(([id, data]) => ({ id, nombre: data.nombre || "Desconocido", coins: data.coins || data.oro || 0 }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  if (!ranking.length) return enviartexto("❌ No hay jugadores registrados.");

  let txt = `🏆 *TOP 10 COINS* 🪙\n\n`;
  ranking.forEach((u, i) => {
    const num = u.id.split("@")[0];
    const tú = u.id === sender ? " 👑" : "";
    txt += `*${i + 1}.* ${u.nombre} (${num}) — *${u.coins}*${tú}\n`;
  });

  await sock.sendMessage(from, { text: txt, mentions: [sender] }, { quoted: m });
  break;
}

// ═══════════════════════════════════════════
// RANKNIVEL
// ═══════════════════════════════════════════
case "ranknivel": {
  if (isGroup) {
    const meta = await sock.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    if (!admins.includes(sender)) return enviartexto("⚠️ Solo administradores del grupo.");
  }

  const users = global.db.data.users;
  const ranking = Object.entries(users)
    .map(([id, data]) => ({
      id,
      nombre: data.nombre || "Desconocido",
      nivel: data.nivel || 1,
      exp: data.exp || 0,
      clase: data.clase || "Novato"
    }))
    .sort((a, b) => b.nivel === a.nivel ? b.exp - a.exp : b.nivel - a.nivel)
    .slice(0, 10);

  if (!ranking.length) return enviartexto("❌ No hay jugadores registrados.");

  let txt = `⚔️ *TOP 10 NIVEL* 💫\n\n`;
  ranking.forEach((u, i) => {
    const num = u.id.split("@")[0];
    const tú = u.id === sender ? " 👑" : "";
    txt += `*${i + 1}.* ${u.nombre} (${num}) — Nv.${u.nivel} [${u.clase}]${tú}\n`;
  });

  await sock.sendMessage(from, { text: txt, mentions: [sender] }, { quoted: m });
  break;
}
// ═══════════════════════════════════════════
// PINTEREST — Búsqueda y descarga múltiple (Álbum)
// ═══════════════════════════════════════════
case "pinterest":
case "pin": {
  const rawArgs = args.join(" ").trim();
  if (!rawArgs) return enviartexto(`❌ Uso: ${PREFIX}pinterest <búsqueda> [cantidad]\nEjemplo: ${PREFIX}pinterest gatos 5`);

  const match = rawArgs.match(/(.*?)(?:\s+(\d+))?$/);
  const query = match[1].trim();
  const limit = parseInt(match[2]) || 5; 
  const maxImages = Math.min(limit, 10); 

  if (!query) return enviartexto(`❌ Uso: ${PREFIX}pinterest <búsqueda> [cantidad]`);

  await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
  
  const waitMsg = await sock.sendMessage(from, { text: `🔍 Buscando *${maxImages}* imágenes de: *${query}*...` }, { quoted: m });

  // APIs actualizadas (sin dominios muertos)
  const apis = [
    `https://pinscrapper.vercel.app/api/search?q=${encodeURIComponent(query)}&limit=${maxImages}`,
    `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`
  ];

  let imageUrls = [];

  for (const url of apis) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const data = await res.json();

      let extracted = [];

      // Lógica para Pinscrapper
      if (data.result && Array.isArray(data.result)) {
        extracted = data.result.map(item => item.image || item.url).filter(Boolean);
      } else if (data.data && Array.isArray(data.data)) {
        extracted = data.data.map(item => item.image || item.url).filter(Boolean);
      } else if (data.results && Array.isArray(data.results)) {
        extracted = data.results.map(item => item.image || item.url).filter(Boolean);
      } else if (data.url || data.image) {
        extracted = [data.url || data.image];
      }

      const validUrls = extracted.filter(u => typeof u === 'string' && u.startsWith('http'));
      imageUrls = [...new Set([...imageUrls, ...validUrls])];

      if (imageUrls.length >= maxImages) break;
    } catch (err) {
      console.error(`Error en API de Pinterest (${url}):`, err.message);
    }
  }

  if (imageUrls.length === 0) {
    await sock.sendMessage(from, { 
      text: `❌ No se encontraron resultados para *${query}*. Intenta con otra búsqueda.`, 
      edit: waitMsg.key 
    });
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return;
  }

  const finalUrls = imageUrls.slice(0, maxImages);

  try {
    await sock.sendMessage(from, { 
      text: `✅ *Encontradas:* ${finalUrls.length} imágenes\n📤 *Enviando álbum de:* ${query}...`, 
      edit: waitMsg.key 
    });
  } catch (e) { console.error("Error editando mensaje:", e); }

  const albumMedia = finalUrls.map((url, index) => ({
    image: { url },
    caption: index === 0 ? `📌 *Pinterest:* ${query}` : undefined 
  }));

  try {
    await sock.sendMessage(from, { album: albumMedia }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  } catch (albumErr) {
    console.error("Error enviando álbum, enviando individualmente:", albumErr);
    for (const url of finalUrls) {
      try {
        await sock.sendMessage(from, { image: { url }, caption: `📌 ${query}` }, { quoted: m });
        await new Promise(r => setTimeout(r, 1000)); 
      } catch (e) { console.error("Error enviando imagen individual:", e); }
    }
    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  }

  break;
}

// ═══════════════════════════════════════════
// PLAY — Descargar audio de YouTube (Multi-API)
// ═══════════════════════════════════════════
case "play":
case "mp3":
case "ytmp3":
case "ytaudio":
case "playaudio": {
  const text = args.join(" ").trim();

  if (!text) {
    return enviartexto("《✧》Por favor, menciona el nombre o URL del video que deseas descargar.");
  }

  try {
    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // Importación dinámica de yt-search
    const { default: yts } = await import("yt-search");

    const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
    const query = videoMatch ? "https://youtu.be/" + videoMatch[1] : text;
    
    let url = query;
    let title = null;
    let thumbBuffer = null;

    // 1. Buscar información del video
    try {
      const search = await yts(query);
      if (search.all.length) {
        const videoInfo = videoMatch 
          ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0] 
          : search.all[0];

        url = videoInfo.url;
        title = videoInfo.title;
        
        // Convertir miniatura a Buffer
        const thumbRes = await fetch(videoInfo.image);
        thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());

        const vistas = (videoInfo.views || 0).toLocaleString();
        const canal = videoInfo.author?.name || "Desconocido";
        
        const infoMessage = `➩ Descargando › *${title}*\n\n` +
          `> ❖ Canal › *${canal}*\n` +
          `> ⴵ Duración › *${videoInfo.timestamp || "Desconocido"}*\n` +
          `> ❀ Vistas › *${vistas}*\n` +
          `> ✩ Publicado › *${videoInfo.ago || "Desconocido"}*\n` +
          `> ❒ Enlace › *${url}*`;

        await sock.sendMessage(from, { image: thumbBuffer, caption: infoMessage }, { quoted: m });
      }
    } catch (err) {
      console.log("Error en yt-search:", err.message);
    }

    // 2. Descargar el audio usando las múltiples APIs
    const audio = await getAudioFromApis(url);
    if (!audio?.url) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto("《✧》 No se pudo descargar el *audio*, intenta más tarde.");
    }

    // 3. Convertir el audio a Buffer y enviarlo
    const audioRes = await fetch(audio.url);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    await sock.sendMessage(from, {
      audio: audioBuffer,
      fileName: `${title || "audio"}.mp3`,
      mimetype: "audio/mpeg"
    }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error("Error en play:", e);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    await enviartexto(`> Ocurrió un error inesperado al ejecutar *${PREFIX}play*.\n> [Error: *${e.message}*]`);
  }
  break;
}

// ═══════════════════════════════════════════
// YTSEARCH / SEARCH — Buscar en YouTube (con preview)
// ═══════════════════════════════════════════
case "ytsearch":
case "search": {
  const query = args.join(" ").trim();
  
  if (!query) {
    return enviartexto("《✧》 Por favor, ingrese el título de un vídeo.");
  }

  try {
    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });

    // Importación dinámica de yt-search
    const { default: yts } = await import("yt-search");

    // 1. Realizar la búsqueda
    const ress = await yts(query);
    if (!ress.all || ress.all.length === 0) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto("❌ No se encontraron resultados.");
    }

    // 2. Limitar a 5 resultados
    const armar = ress.all.slice(0, 5);
    
    // 3. Obtener los datos del primer resultado para el preview
    const firstResult = armar[0];

    // 4. Construir el texto con los resultados
    let teks2 = armar.map((v) => {
      switch (v.type) {
        case 'video':
          return `➩ *Título ›* *${v.title}* \n\n> ⴵ *Duración ›* ${v.timestamp}\n> ❖ *Subido ›* ${v.ago}\n> ✿ *Vistas ›* ${v.views}\n> ❒ *Url ›* ${v.url}`.trim();
        case 'channel':
          return `> ❖ Canal › *${v.name}*\n> ❒ Url › ${v.url}\n> ❀ Subscriptores › ${v.subCountLabel} (${v.subCount})\n> ✿ Videos totales › ${v.videoCount}`.trim();
        default:
          return null;
      }
    }).filter((v) => v).join('\n\n╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ┈┄۪ ─ׄ〬╼\n\n');

    // 5. Enviar el resultado con la tarjeta de preview
    await sock.sendMessage(from, { 
      text: teks2,
      contextInfo: {
        externalAdReply: {
          title: firstResult.title || 'YouTube Search',
          body: `Canal: ${firstResult.author?.name || 'Desconocido'}`,
          thumbnailUrl: firstResult.image,
          sourceUrl: firstResult.url,
          mediaType: 1,
          showAdAttribution: true,
          renderLargerThumbnail: true // 👈 Ponlo en false si quieres la tarjeta pequeña
        }
      }
    }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error("Error en ytsearch:", e);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    await enviartexto(`> Ocurrió un error inesperado al ejecutar *${PREFIX}${comando}*.\n> [Error: *${e.message}*]`);
  }

  break;
}
    // ═══════════════════════════════════════════
    // SUBBOTS — 12 COMANDOS
    // ═══════════════════════════════════════════

    case "jadibot":
    case "subbot": {
      const targetNum = args[0]?.replace(/\D/g, "");
      if (!targetNum || targetNum.length < 8) {
        return enviartexto(
          `⚠️ Uso: ${PREFIX}jadibot <número>\nEjemplo: ${PREFIX}jadibot 5354386852\n\n` +
          `_También puedes usar_ *${PREFIX}code* _para crear un subbot con tu propio número._`
        );
      }
      await startSubbot(sock, `${targetNum}@s.whatsapp.net`, from, enviartexto, "code");
      break;
    }

case "code": {
  const num = jidToNumber(sender);
  
  // Si el sender no es un número real (es LID o inválido)
  if (!num || num.length < 8 || num.length > 15 || /^1\d{14}$/.test(num)) {
    return enviartexto(
      `⚠️ *No puedo detectar tu número real desde aquí.*\n\n` +
      `Esto pasa cuando usas el comando desde un grupo con LID.\n\n` +
      `👉 Usa el comando con tu número explícito:\n` +
      `*${PREFIX}jadibot <tu número con código de país>*\n\n` +
      `Ejemplo: *${PREFIX}jadibot 5354386852*`
    );
  }
  
  await startSubbot(sock, sender, from, enviartexto, "code");
  break;
}
    case "stopbot":
    case "stopjadibot": {
      const phoneNumber = jidToNumber(sender);
      const stopped = await stopSubbot(phoneNumber);
      if (stopped) await enviartexto("✅ Tu sub-bot ha sido detenido.");
      else await enviartexto("⚠️ No tienes ningún sub-bot activo.");
      break;
    }

// ═══════════════════════════════════════════
// BOTS / SOCKETS — Listar subbots activos
// ═══════════════════════════════════════════
case "bots":
case "sockets":
case "listsubbots":
case "subbots":
case "botslist":
case "listbots": {
  const mainBotNum = jidToNumber(sock.user.id);
  const mainBotJid = mainBotNum + "@s.whatsapp.net";
  const mainBotName = sock.subconfig?.botname || BOT_NAME;

  let groupParticipants = [];
  if (isGroup) {
    const meta = await sock.groupMetadata(from).catch(() => null);
    if (meta) {
      // Extraemos los números de los participantes para comparar fácilmente
      groupParticipants = meta.participants.map(p => jidToNumber(p.id) + "@s.whatsapp.net");
    }
  }

  const subsDir = "./Sessions/SubBots";
  let subNums = [];
  
  // Leer la carpeta de subbots para ver cuáles tienen credenciales
  if (fs.existsSync(subsDir)) {
    subNums = fs.readdirSync(subsDir).filter(f => fs.existsSync(`./Sessions/SubBots/${f}/creds.json`));
  }

  const categorized = { Owner: [], Sub: [] };
  const mentions = [];
  
  // Verificar si el bot principal está en el grupo (o si es chat privado)
  const isMainBotInGroup = !isGroup || groupParticipants.includes(mainBotJid);

  if (isMainBotInGroup) {
    mentions.push(mainBotJid);
    categorized.Owner.push(`- [Owner *${mainBotName}*] › @${mainBotNum}`);
  }

  // Verificar cuáles subbots están en el grupo actual
  subNums.forEach(num => {
    const subJid = num + "@s.whatsapp.net";
    if (!isGroup || groupParticipants.includes(subJid)) {
      mentions.push(subJid);
      const config = loadSubConfig(num);
      const name = config.botname || "Sub-Bot";
      categorized.Sub.push(`- [Sub *${name}*] › @${num}`);
    }
  });

  const totalOwner = 1; // Siempre hay 1 bot principal
  const totalSub = subNums.length;
  const totalBots = totalOwner + totalSub;
  const totalInGroup = categorized.Owner.length + categorized.Sub.length;

  let message = `ꕥ Números de *bots* activos *(${totalBots})*\n\n`;
  message += `❖ Principales › *${totalOwner}*\n`;
  message += `✿ Subs › *${totalSub}*\n\n`;
  message += `➭ *Bots en el grupo ›* ${totalInGroup}\n`;

  if (categorized.Owner.length) {
    message += categorized.Owner.join('\n') + '\n';
  }
  if (categorized.Sub.length) {
    message += categorized.Sub.join('\n') + '\n';
  }

  // Enviar el mensaje con las menciones
  await sock.sendMessage(from, { 
    text: message.trim(), 
    mentions 
  }, { quoted: m });

  break;
}
    case "addowner":
    case "agregarowner": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño puede usar esto.");
      const { jid: targetJid } = getTargetFromMsg(m, args);
      if (!targetJid) return enviartexto("⚠️ Menciona (@usuario) o responde a un mensaje.");
      const targetNum = jidToNumber(targetJid);
      const selfNum = jidToNumber(sock.user.id);
      try {
        const cfg = loadSubConfig(selfNum);
        if (!cfg.owners) cfg.owners = [];
        if (cfg.owners.includes(targetNum)) return enviartexto(`⚠️ @${targetNum} ya es owner.`);
        cfg.owners.push(targetNum);
        saveSubConfig(selfNum, cfg);
        sock.subconfig = cfg;
        await sock.sendMessage(from, {
          text: `✅ @${targetNum} agregado como owner.`,
          mentions: [targetJid]
        }, { quoted: m });
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al agregar owner.");
      }
      break;
    }

    case "delowner":
    case "eliminarowner": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño puede usar esto.");
      const { jid: targetJid } = getTargetFromMsg(m, args);
      if (!targetJid) return enviartexto("⚠️ Menciona (@usuario) o responde a un mensaje.");
      const targetNum = jidToNumber(targetJid);
      const selfNum = jidToNumber(sock.user.id);
      try {
        const cfg = loadSubConfig(selfNum);
        if (!cfg.owners || !cfg.owners.includes(targetNum)) {
          return enviartexto(`⚠️ @${targetNum} no es owner.`);
        }
        cfg.owners = cfg.owners.filter(n => n !== targetNum);
        saveSubConfig(selfNum, cfg);
        sock.subconfig = cfg;
        await sock.sendMessage(from, {
          text: `✅ @${targetNum} eliminado como owner.`,
          mentions: [targetJid]
        }, { quoted: m });
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al eliminar owner.");
      }
      break;
    }

    case "botsesion":
    case "botsession": {
      const senderNum = jidToNumber(sender);
      const selfNum = jidToNumber(sock.user?.id || "");
      const isSessionOwner =
        m.key.fromMe ||
        senderNum === selfNum ||
        sock.subconfig?.owners?.includes(senderNum) ||
        (config.owners || []).some(o => String(o.number).replace(/\D/g, "") === senderNum);
      if (!isSessionOwner) return enviartexto("⛔ Solo el dueño de la sesión o el global owner.");

      const action = args[0]?.toLowerCase();
      if (!action) {
        const enabled = isSessionEnabled();
        return enviartexto(
          `🌐 *Estado global:*\n\n${enabled ? "🟢 ACTIVA" : "🔴 INACTIVA"}\n\n` +
          `• *${PREFIX}botsesion off* — Apagar\n• *${PREFIX}botsesion on* — Activar`
        );
      }
      if (action === "off") { setSessionEnabled(false); return enviartexto("🔴 *Sesión global desactivada.*"); }
      if (action === "on")  { setSessionEnabled(true);  return enviartexto("🟢 *Sesión global activada.*"); }
      return enviartexto(`⚠️ Uso: ${PREFIX}botsesion on|off`);
    }

    case "setbotbio": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
      const newBio = args.join(" ").trim();
      if (!newBio) return enviartexto("⚠️ Ingresa el texto de la biografía.");
      try {
        await sock.updateProfileStatus(newBio);
        await enviartexto(`✅ Biografía cambiada a: *${newBio}*`);
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al cambiar biografía.");
      }
      break;
    }

case "setbotname":
case "botnombre": {
  if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
  const newName = args.join(" ").trim();
  const botJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
  
  if (!newName) return enviartexto(`📛 *Nombre actual:* ${global.db.data.settings[botJid]?.botname || BOT_NAME}`);

  try {
    await sock.updateProfileName(newName);
    
    // Guardar en la base de datos
    if (!global.db.data.settings[botJid]) global.db.data.settings[botJid] = {};
    global.db.data.settings[botJid].botname = newName;
    
    await enviartexto(`✅ *Nombre cambiado a:* ${newName}`);
  } catch (err) {
    await enviartexto("❌ Error al cambiar nombre.");
  }
  break;
}
    case "setbotpp": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
      const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMessage = m.message?.imageMessage || quotedMsg?.imageMessage;
      if (!imageMessage) return enviartexto("⚠️ Responde a una imagen con este comando.");
      try {
        await enviartexto("⏳ Descargando y actualizando foto...");
        const stream = await downloadContentFromMessage(imageMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const selfJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
        await sock.updateProfilePicture(selfJid, buffer);
        await enviartexto("✅ Foto de perfil actualizada.");
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al cambiar foto.");
      }
      break;
    }

    case "setboticono":
    case "setboticon": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
      const newIcon = args.join(" ").trim();
      if (!newIcon) return enviartexto("⚠️ Ingresa el emoji del icono.");
      try {
        const selfNum = jidToNumber(sock.user.id);
        const cfg = loadSubConfig(selfNum);
        cfg.icono = newIcon;
        saveSubConfig(selfNum, cfg);
        sock.subconfig = cfg;
        await enviartexto(`✅ Icono cambiado a: *${newIcon}*`);
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al cambiar icono.");
      }
      break;
    }

    case "setbotlogo": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
      const newLogo = args.join(" ").trim();
      if (!newLogo) return enviartexto("⚠️ Ingresa la URL del logo.");
      try {
        const selfNum = jidToNumber(sock.user.id);
        const cfg = loadSubConfig(selfNum);
        cfg.logo = newLogo;
        saveSubConfig(selfNum, cfg);
        sock.subconfig = cfg;
        await enviartexto("✅ Logo cambiado.");
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al cambiar logo.");
      }
      break;
    }

    case "setbotwm": {
      if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
      const newWm = args.join(" ").trim();
      if (!newWm) return enviartexto("⚠️ Ingresa el texto de la marca de agua.");
      try {
        const selfNum = jidToNumber(sock.user.id);
        const cfg = loadSubConfig(selfNum);
        cfg.wm = newWm;
        saveSubConfig(selfNum, cfg);
        sock.subconfig = cfg;
        await enviartexto(`✅ Marca de agua cambiada a: *${newWm}*`);
      } catch (err) {
        console.error(err);
        await enviartexto("❌ Error al cambiar marca de agua.");
      }
      break;
    }

    default:
      await enviartexto(`❓ Comando no reconocido. Usa ${PREFIX}menu.`);
      break;
  }
}

// 🚀 INICIAR
startLevi().catch((err) => {

console.error("❌ Error fatal al iniciar:", err);
  process.exit(1);
});

