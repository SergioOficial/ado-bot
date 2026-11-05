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
import sharp from "sharp";
import pino from "pino";
import readline from "readline";
import fs from "fs";
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import fetch from "node-fetch";
import chalk from "chalk";
import cfonts from "cfonts";
import { exec } from "child_process";
// 📂 BASE DE DATOS RPG
const rpgFile = "./Archivos/rpg.json";
if (!fs.existsSync("./Archivos")) fs.mkdirSync("./Archivos");
if (!fs.existsSync(rpgFile)) fs.writeFileSync(rpgFile, JSON.stringify({}, null, 2));
let rpgDB = JSON.parse(fs.readFileSync(rpgFile, "utf8"));
const rpg = rpgDB;
function saveRPG() {
  fs.writeFileSync(rpgFile, JSON.stringify(rpgDB, null, 2));
}

// 📂 BASE DE DATOS PERFILES
const perfilani = "./Archivos/perfiani.json";
if (!fs.existsSync(perfilani)) fs.writeFileSync(perfilani, JSON.stringify({}, null, 2));
let regix = JSON.parse(fs.readFileSync(perfilani, "utf8"));
function dowani() {
  fs.writeFileSync(perfilani, JSON.stringify(regix, null, 2));
}

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
   ❄️ *¡Hola!* @${numero} ❄️
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
│ 📌 ${PREFIX}pinterest <búsqueda>
│ 🎵 ${PREFIX}play <canción>
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
│ 📋 ${PREFIX}listsubbots → Listar subbots
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

    // ═══════════════════════════════════════════
    // REG
    // ═══════════════════════════════════════════
    case "reg": {
      const [nombre, edad, genero] = args;
      if (!nombre || !edad || !genero) return enviartexto(`⚔️ Ejemplo: ${PREFIX}reg Levi 22 M`);
      if (regix[sender]) return enviartexto("⚠️ Ya estás registrado.");
      const fecha = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
      const numero = sender.split("@")[0];
      regix[sender] = { id: sender, numero, nombre, edad, genero: genero.toUpperCase(), fecha };
      dowani();
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

    // ═══════════════════════════════════════════
    // TRABAJAR (RPG)
    // ═══════════════════════════════════════════
    case "trabajar": {
      if (!rpg[sender]) rpg[sender] = { oro: 0, exp: 0, nivel: 1, lastWork: 0 };
      const now = Date.now();
      const cooldown = 5 * 60 * 1000;
      if (now - (rpg[sender].lastWork || 0) < cooldown) {
        const remain = cooldown - (now - rpg[sender].lastWork);
        const minutos = Math.floor(remain / 60000);
        const segundos = Math.floor((remain % 60000) / 1000);
        return enviartexto(`⌛ Vuelve en *${minutos}m ${segundos}s*.`);
      }
      const trabajos = ["mercader", "forjador", "aventurero", "alquimista", "minero", "vigilante", "cazador", "mago"];
      const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
      const suerte = Math.random();
      let oroGanado = 0, expGanada = 0, mensajeResultado = "";
      if (suerte < 0.7) {
        oroGanado = Math.floor(Math.random() * 35000) + 250000;
        expGanada = Math.floor(Math.random() * 50) + 25;
        rpg[sender].oro += oroGanado;
        rpg[sender].exp += expGanada;
        mensajeResultado = `✨ *Buen trabajo como ${trabajo}.*\nGanaste *¥${oroGanado.toLocaleString()}* y *${expGanada} exp.*`;
      } else {
        const perdida = Math.floor(Math.random() * 20000) + 5000;
        rpg[sender].oro = Math.max(0, rpg[sender].oro - perdida);
        expGanada = Math.floor(Math.random() * 10) + 5;
        rpg[sender].exp += expGanada;
        mensajeResultado = `💢 *Trabajo fallido como ${trabajo}...*\nPerdiste *¥${perdida.toLocaleString()}* y ganaste *${expGanada} exp.*`;
      }
      rpg[sender].lastWork = now;
      saveRPG();
      await enviartexto(
        `${mensajeResultado}\n\n💰 Balance: *¥${rpg[sender].oro.toLocaleString()}*\n🏷️ Nivel: *${rpg[sender].nivel}*\n${FOOTER}`
      );
      break;
    }

// ═══════════════════════════════════════════
    // PERFIL
    // ═══════════════════════════════════════════
    case "perfil": {
      const levi = regix[sender];
      if (!levi) return enviartexto(`❗ No estás registrado. Usa ${PREFIX}reg`);
      const datos = rpgDB[sender] || { coins: 0, exp: 0, nivel: 1, clase: "Novato" };
      let pfp;
      try { pfp = await sock.profilePictureUrl(sender, "image"); }
      catch { pfp = "https://i.postimg.cc/9fnHnptg/1761824297335.jpg"; }
      const nivelMaxXP = datos.nivel * 100;
      const progreso = Math.min(10, Math.floor((datos.exp / nivelMaxXP) * 10));
      const barraXP = "▰".repeat(progreso) + "▱".repeat(10 - progreso);
      const textoPerfil = `
╭─╼┈━༻ 💫 *TU PERFIL - ${BOT_NAME}* 💫 ༺━┈╾─╮
│ 👤 *Nombre:* ${levi.nombre}
│ 🎂 *Edad:* ${levi.edad}
│ ⚧ *Género:* ${levi.genero}
│ 📅 *Registro:* ${levi.fecha}
│ 📞 *Número:* +${levi.numero}
╰────────────────────────────╯

╭─╼┈━༻ ⚔️ *RPG STATS* ⚔️ ༺━┈╾─╮
│ 🎭 *Clase:* ${datos.clase}
│ 💥 *Nivel:* ${datos.nivel}
│ ✨ *Experiencia:* ${datos.exp}/${nivelMaxXP}
│ 🔋 *Progreso:* ${barraXP}
│ 💰 *Coins:* ${datos.coins || datos.oro || 0} 🪙
╰────────────────────────────╯

${FOOTER}`.trim();
      await sock.sendMessage(from, { image: { url: pfp }, caption: textoPerfil, mentions: [sender] }, { quoted: m });
      break;
    }

    // ═══════════════════════════════════════════
    // CAZAR
    // ═══════════════════════════════════════════
    case "cazar": {
      if (!rpg[sender]) rpg[sender] = { oro: 0, exp: 0, nivel: 1 };
      const expGanada = Math.floor(Math.random() * 40) + 10;
      rpg[sender].exp += expGanada;
      if (rpg[sender].exp >= 100) {
        rpg[sender].nivel++;
        rpg[sender].exp -= 100;
        await enviartexto(`⚡ *¡Subiste al nivel ${rpg[sender].nivel}!* 🥳\n${FOOTER}`);
      } else {
        await enviartexto(`🏹 *Cazaste un monstruo y ganaste ${expGanada} exp.* ⭐\n${FOOTER}`);
      }
      saveRPG();
      break;
    }

    // ═══════════════════════════════════════════
    // REINICIAR RPG
    // ═══════════════════════════════════════════
    case "reiniciarrpg": {
      if (!rpg[sender]) return enviartexto("❌ No tienes datos RPG.");
      delete rpg[sender];
      saveRPG();
      await enviartexto("♻️ *Progreso RPG reiniciado.*");
      break;
    }

    // ═══════════════════════════════════════════
    // CLASE
    // ═══════════════════════════════════════════
    case "clase": {
      const opciones = ["guerrero", "mago", "arquero"];
      const eleccion = args[0]?.toLowerCase();
      if (!rpg[sender]) rpg[sender] = { oro: 0, exp: 0, nivel: 1, clase: null };
      if (!eleccion) return enviartexto(`🎭 *Elige:*\n\n⚔️ ${PREFIX}clase guerrero\n🔮 ${PREFIX}clase mago\n🏹 ${PREFIX}clase arquero`);
      if (!opciones.includes(eleccion)) return enviartexto("❌ Clase inválida.");
      rpg[sender].clase = eleccion.charAt(0).toUpperCase() + eleccion.slice(1);
      saveRPG();
      const desc = {
        guerrero: "⚔️ *Guerrero:* Fuerte y valiente.",
        mago: "🔮 *Mago:* Sabio y poderoso.",
        arquero: "🏹 *Arquero:* Rápido y preciso."
      };
      await enviartexto(`✨ Elegiste: *${rpg[sender].clase}*\n\n${desc[eleccion]}`);
      break;
    }

    // ═══════════════════════════════════════════
    // BAL
    // ═══════════════════════════════════════════
    case "coins":
    case "balance":
    case "bal": {
      if (!rpg[sender]) rpg[sender] = { coins: 0, oro: 0, exp: 0, nivel: 1 };
      const user = rpg[sender];
      const coins = user.coins || user.oro || 0;
      const mensaje = `╭───「 *💰 Balance* 」\n│ 💳 @${sender.split("@")[0]}\n│ 🏅 Nivel: ${user.nivel || 1}\n│ 📈 Exp: ${(user.exp || 0).toLocaleString()}\n│ 💎 Riqueza: ¥${coins.toLocaleString()}\n╰───────────────────────\n${FOOTER}`;
      await sock.sendMessage(from, { text: mensaje, mentions: [sender] }, { quoted: m });
      break;
    }

    // ═══════════════════════════════════════════
    // DAILY
    // ═══════════════════════════════════════════
    case "daily":
    case "diario": {
      if (!rpg[sender]) rpg[sender] = { coins: 0, lastDaily: 0, streak: 0 };
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const timeSinceLast = now - (rpg[sender].lastDaily || 0);
      if (timeSinceLast < DAY) {
        const remain = DAY - timeSinceLast;
        const h = Math.floor(remain / 3600000);
        const mi = Math.floor((remain % 3600000) / 60000);
        const s = Math.floor((remain % 60000) / 1000);
        return enviartexto(`《✧》Ya reclamaste hoy. Vuelve en *${h}h ${mi}m ${s}s* ⏳`);
      }
      const missed = timeSinceLast > DAY * 2;
      rpg[sender].streak = missed ? 1 : (rpg[sender].streak || 0) + 1;
      const BASE = 30000;
      const BONUS = 1 + 0.15 * (rpg[sender].streak - 1);
      const reward = Math.floor(BASE * BONUS);
      rpg[sender].coins = (rpg[sender].coins || 0) + reward;
      rpg[sender].lastDaily = now;
      saveRPG();
      const next = Math.floor(BASE * (1 + 0.15 * rpg[sender].streak));
      await enviartexto(
        `「✿」*Recompensa Diaria*\n\n🔥 ¡Reclamado *¥${reward.toLocaleString()}*! (Día *${rpg[sender].streak}*)\n> Día *${rpg[sender].streak + 1}* » *+¥${next.toLocaleString()}*\n\n💰 Balance: *¥${rpg[sender].coins.toLocaleString()}*\n${FOOTER}`
      );
      break;
    }

    // ═══════════════════════════════════════════
    // WORK (ECONOMÍA)
    // ═══════════════════════════════════════════
    case "work": {
      if (!rpg[sender]) rpg[sender] = { coins: 0, lastWork: 0 };
      const now = Date.now();
      const cooldown = 5 * 60 * 1000;
      if (now - (rpg[sender].lastWork || 0) < cooldown) {
        const remain = cooldown - (now - rpg[sender].lastWork);
        const min = Math.floor(remain / 60000);
        const seg = Math.floor((remain % 60000) / 1000);
        return enviartexto(`⏳ Vuelve en *${min}m ${seg}s* 🔔`);
      }
      const suerte = Math.random();
      let reward, mensaje;
      if (suerte < 0.7) {
        reward = Math.floor(Math.random() * 35000) + 35000;
        rpg[sender].coins += reward;
        mensaje = `✿ Trabajaste duro y ganaste *¥${reward.toLocaleString()} coins 💷*`;
      } else {
        reward = Math.floor(Math.random() * 20000) + 5000;
        rpg[sender].coins = Math.max(0, rpg[sender].coins - reward);
        mensaje = `💢 Perdiste *¥${reward.toLocaleString()} coins 💷*`;
      }
      rpg[sender].lastWork = now;
      saveRPG();
      await enviartexto(`「✿」${mensaje}\n> 💰 Balance: *¥${rpg[sender].coins.toLocaleString()}*\n${FOOTER}`);
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
      const ranking = Object.entries(rpgDB)
        .map(([id, d]) => ({ id, nombre: regix[id]?.nombre || "Desconocido", coins: d.coins || d.oro || 0 }))
        .sort((a, b) => b.coins - a.coins)
        .slice(0, 10);
      if (!ranking.length) return enviartexto("❌ No hay jugadores.");
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
      const ranking = Object.entries(rpgDB)
        .map(([id, d]) => ({
          id,
          nombre: regix[id]?.nombre || "Desconocido",
          nivel: d.nivel || 1,
          exp: d.exp || 0,
          clase: d.clase || "Novato"
        }))
        .sort((a, b) => b.nivel === a.nivel ? b.exp - a.exp : b.nivel - a.nivel)
        .slice(0, 10);
      if (!ranking.length) return enviartexto("❌ No hay jugadores.");
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
    // PINTEREST
    // ═══════════════════════════════════════════
    case "pinterest":
    case "pin": {
      const query = args.join(" ").trim();
      if (!query) return enviartexto(`❌ Uso: ${PREFIX}pinterest <búsqueda>`);
      await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
      const waitMsg = await sock.sendMessage(from, { text: `🔍 Buscando: *${query}*...` }, { quoted: m });
      const apis = [
        `https://tester-web.onrender.com/api/pinterest?query=${encodeURIComponent(query)}&limit=1`,
        `https://api.stellarwa.xyz/search/pinterest?query=${encodeURIComponent(query)}&key=YukiWaBot`,
        `https://api.delirius.store/search/pinterest?text=${encodeURIComponent(query)}`,
        `https://api.vreden.web.id/api/v1/search/pinterest?query=${encodeURIComponent(query)}`,
        `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`
      ];
      let mediaUrl = null;
      for (const url of apis) {
        try {
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!res.ok) continue;
          const data = await res.json();
          let extracted = null;
          if (url.includes("tester-web") && data.results?.[0]) {
            extracted = data.results[0].descarga || data.results[0].url;
          } else if (Array.isArray(data.result) && data.result[0]) {
            extracted = data.result[0].url || data.result[0].image || data.result[0].thumbnail;
          } else if (Array.isArray(data.data) && data.data[0]) {
            extracted = data.data[0].url || data.data[0].image;
          } else if (data.images?.[0]) extracted = data.images[0];
          else if (data.url) extracted = data.url;
          else if (data.image) extracted = data.image;
          if (extracted?.startsWith("http")) { mediaUrl = extracted; break; }
        } catch (err) { console.error("Pinterest API:", err.message); }
      }
      try { await sock.sendMessage(from, { delete: waitMsg.key }); } catch {}
      if (!mediaUrl) {
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        return enviartexto(`❌ Sin resultados para *${query}*.`);
      }
      const isVideo = /\.(mp4|webm|mov)$/i.test(mediaUrl);
      const caption = `📌 *Pinterest:* ${query}\n\n${FOOTER}`;
      try {
        if (isVideo) {
          await sock.sendMessage(from, { video: { url: mediaUrl }, caption, mimetype: "video/mp4" }, { quoted: m });
        } else {
          await sock.sendMessage(from, { image: { url: mediaUrl }, caption }, { quoted: m });
        }
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      } catch (err) {
        console.error("Error media:", err);
        await enviartexto(`⚠️ No se pudo enviar.\n🔗 ${mediaUrl}`);
      }
      break;
    }

// ═══════════════════════════════════════════
// PLAY (Reparado con @denzy-official/youtube_scraper)
// ═══════════════════════════════════════════
case "play": {
  if (!args[0]) {
    return enviartexto(`✳️ Ejemplo: ${PREFIX}play jalebi baby`);
  }

  const query = args.join(" ");
  await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

  try {
    // Importación dinámica para ESM
    const yt = await import("@denzy-official/youtube_scraper");

    // 1. Buscar y descargar el MP3 directamente por el nombre
    const result = await yt.ytmp3(query);

    if (!result || !result.status || !result.download || !result.download.url) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto("❌ No se encontró la canción o el enlace de descarga falló.");
    }

    const { metadata, download } = result;

    // 2. Enviar la miniatura y el título
    await sock.sendMessage(from, {
      image: { url: metadata.thumbnail || "https://i.postimg.cc/9fnHnptg/1761824297335.jpg" },
      caption: `🎵 *${metadata.title}*\n👤 *${metadata.author?.name || "Desconocido"}*\n\n💿 Enviando audio...`,
    }, { quoted: m });

    // 3. Enviar el audio usando la URL directa del MP3
    await sock.sendMessage(from, {
      audio: { url: download.url },
      mimetype: "audio/mpeg",
      fileName: `${metadata.title}.mp3`
    }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("Error en #play (paquete):", err);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    await enviartexto(`❌ Error al procesar la música.\n_${err.message}_`);
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

    case "listsubbots":
    case "subbots":
    case "bots":
    case "botslist":
    case "listbots": {
      const active = getActiveSubbots();
      if (active.size === 0) {
        return enviartexto(
          `ℹ️ *No hay sub-bots activos.*\n\n💡 Usa *${PREFIX}jadibot <número>* para crear uno.`
        );
      }
      let list = `🤖 *SUB-BOTS ACTIVOS (${active.size}/${MAX_SUBBOTS})*\n\n`;
      let i = 1;
      for (const [num, sub] of active.entries()) {
        const name = sub?.subconfig?.botname || "";
        list += `${i}. @${num}${name ? ` — *${name}*` : ""}\n`;
        i++;
      }
      list += `\n_Slots disponibles: ${MAX_SUBBOTS - active.size}_`;
      await sock.sendMessage(from, {
        text: list,
        mentions: Array.from(active.keys()).map(n => `${n}@s.whatsapp.net`)
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
      if (!newName) return enviartexto(`📛 *Nombre actual:* ${sock.subconfig?.botname || BOT_NAME}\n\nUso: ${PREFIX}setbotname <nombre>`);
      try {
        await sock.updateProfileName(newName);
        const selfNum = jidToNumber(sock.user.id);
        const cfg = loadSubConfig(selfNum);
        cfg.botname = newName;
        saveSubConfig(selfNum, cfg);
        sock.subconfig = cfg;
        await enviartexto(`✅ *Nombre cambiado a:* ${newName}`);
      } catch (err) {
        console.error(err);
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

