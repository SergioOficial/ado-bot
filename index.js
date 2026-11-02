// CREADOR: Jeferson Fernández ⚔️ Colab Sergio Gómez Gort 

// 📦 IMPORTACIONES
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import sharp from "sharp";
import pino from "pino";
import readline from "readline";
import fs from "fs";
import { Boom } from "@hapi/boom";
import { config } from "./config.js"; // ✅ CONFIG GLOBAL
import fetch from "node-fetch";

// Ruta del archivo RPG
const rpgFile = "./Archivos/rpg.json";

// Crear carpeta Archivos si no existe
if (!fs.existsSync("./Archivos")) fs.mkdirSync("./Archivos");

// Crear archivo si no existe
if (!fs.existsSync(rpgFile)) fs.writeFileSync(rpgFile, JSON.stringify({}, null, 2));

// Cargar datos RPG
let rpgDB = JSON.parse(fs.readFileSync(rpgFile, "utf8"));

const rpg = rpgDB;

// Guardar datos RPG
function saveRPG() {
  fs.writeFileSync(rpgFile, JSON.stringify(rpgDB, null, 2));
}

// 🗂️ Registro de usuarios
const perfilani = "./Archivos/perfiani.json";
if (!fs.existsSync(perfilani)) fs.writeFileSync(perfilani, JSON.stringify({}, null, 2));
let regix = JSON.parse(fs.readFileSync(perfilani, "utf8"));

function dowani() {
  fs.writeFileSync(perfilani, JSON.stringify(regix, null, 2));
}
// 🎨 COLORES Y BANNER PRINCIPAL ⚔️
// ---------------------------------

import chalk from "chalk";
import cfonts from "cfonts";

// Función para aplicar color fácilmente
const color = (text, colorName = "green") => {
  try {
    return chalk[colorName](text); // Ej: chalk.red("texto")
  } catch {
    return chalk.green(text); // fallback
  }
};

// 🧙‍♂️ Banner de inicio tipo anime épico
const banner = cfonts.render("Levi|Bot", {
  font: "block", // Fuentes recomendadas: 'block', 'chrome', 'shade', 'tiny', 'pallet'
  align: "center",
  gradient: ["cyan", "magenta"], // Puedes probar ["green","blue"], ["#00BFFF","#8A2BE2","#FF00FF"], ["red","yellow"]
  lineHeight: 1,
  letterSpacing: 1,
  space: true,
  env: "node"
});

// Texto secundario debajo del banner
const subBanner = cfonts.render("⚔️ by Jeferson Fernández 💫 from Sergio Gómez Gort", {
  font: "console",
  align: "center",
  gradient: ["yellow", "cyan"]
});

// Mostrar el banner al iniciar el bot
console.clear();
console.log(banner.string);
console.log(subBanner.string);
console.log(color("💫 Levi-Bot se está iniciando...", "magenta"));

// 🧠 VARIABLES GLOBALES DESDE CONFIG
const PREFIX = config.prefix;
const BOT_NAME = config.botName;
const OWNER_NAME = config.ownerName;
const OWNER_NUMBER = config.ownerNumber;
const VERSION = config.version;
const FOOTER = config.footer;

// 🚀 Función principal del bot
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

// 🔐 Vinculación del dispositivo (controlada por eventos)
let pairingCodeRequested = false;
let phoneNumber = null;

if (!sock.authState.creds.registered) {
  // En local usará la consola; en BotKeep leerá el secreto WHATSAPP_NUMBER
  phoneNumber = process.env.WHATSAPP_NUMBER || await ask("📱 Ingresa tu número de WhatsApp (ejemplo: 573001234567): ");
  if (!phoneNumber) {
    console.error("❌ Error: Define la variable de entorno WHATSAPP_NUMBER o ingresa el número manualmente.");
    process.exit(1);
  }
  console.log(`📱 Número configurado para vincular: ${phoneNumber}`);
}

sock.ev.on("creds.update", saveCreds);

// ⚙️ Estado de conexión
sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, qr } = update;

  // 🟢 Pedir el parincode SOLO cuando la conexión esté lista
  if (
    !sock.authState.creds.registered &&
    !pairingCodeRequested &&
    (connection === "connecting" || qr)
  ) {
    pairingCodeRequested = true;
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`\n🔐 Tu código de vinculación es: ${code}`);
      console.log("➡️ En tu WhatsApp: Dispositivos vinculados → Vincular dispositivo → Introducir código.\n");
    } catch (err) {
      console.error("❌ Error al solicitar el parincode:", err.message);
      pairingCodeRequested = false; // Permitir reintento
    }
  }

  if (connection === "open") {
    console.log(`✅ ${BOT_NAME} conectado correctamente.`);
  }

  if (connection === "close") {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
    if (reason === DisconnectReason.loggedOut) {
      console.log("❌ Sesión cerrada. Borra la carpeta /session y vuelve a generar el parincode.");
    } else {
      console.log("♻️ Reconectando...");
      startLevi();
    }
  }
});
  // 🟢 Escuchar mensajes
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;

    const texto = m.message.conversation || m.message.extendedTextMessage?.text;
    if (!texto) return;

    // Solo responde si empieza con el prefijo global
    if (!texto.startsWith(PREFIX)) return;
    const { remoteJid, participant } = m.key;
    const isGroup = remoteJid.endsWith('@g.us');
    const from = m.key.remoteJid;
    const sender = m.key.participant || from;
    const args = texto.slice(PREFIX.length).trim().split(/\s+/);
    const comando = args.shift().toLowerCase();
    const enviartexto = (txt) => sock.sendMessage(from, { text: txt }, { quoted: m });

    console.log(`💬 [${from}] ${texto}`);
    console.log(`🧩 Comando detectado: ${comando}`);


    // ⚔️ Comandos tipo CASE
    
    switch (comando) {
          case "menu":
case "help": {
  const user = m.pushName || "Usuario";
  const numero = sender.split("@")[0];
  const pfp = await sock.profilePictureUrl(sender, "image").catch(() => "https://i.postimg.cc/9fnHnptg/1761824297335.jpg");

  const banner = `
︶•︶°︶•︶°︶•︶°︶•︶°︶•︶°︶
🎃 *¡Hola!* @${numero}, soy 𝐋𝐄𝐕𝐈-𝐁𝐎𝐓
> Aquí tienes mi lista de comandos actualizada 🍂

╭┈ࠢ͜┅͜─༻ *𝐁𝐎𝐓 𝐈𝐍𝐅𝐎* ༺─┅ࠢ͜┈
│ 💠 *Nombre:* ${BOT_NAME}
│ ⚙️ *Versión:* ${VERSION}
│ 👑 *Owner:* ${OWNER_NAME}
│ 👥 *Usuarios:* ${Object.keys(regix).length || "1"}
│ 🧩 *Librería:* Baileys Multi Device
╰──────────────────────────────╯
`;

  const secciones = `
╭─⭑ *𝐂𝐎𝐈𝐍𝐒 / 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀* 💰
│ 💵 ${PREFIX}work → Trabaja y gana coins
│ 🎁 ${PREFIX}daily → Reclama tus coins diarios (cada 24h)
│ 💳 ${PREFIX}bal → Consulta tu balance actual
│ 🏦 ${PREFIX}shop → Próximamente: tienda de objetos
╰────────────────────────────╯
╭─⭑ *𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒* ⚙️
│ 🏓 ${PREFIX}ping → Mide la latencia del bot
│ 🪧 ${PREFIX}help/${PREFIX}menu → Ver este menu
╰────────────────────────────╯
╭─⭑ *𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀* 🎨
│ 📌 ${PREFIX}pinterest <búsqueda> → Busca imágenes en Pinterest
│ 🎵 ${PREFIX}play <canción> → Descarga audio de YouTube
╰────────────────────────────╯

╭─⭑ *𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐎𝐑𝐄𝐒* 🖼️
│ 🖼️ ${PREFIX}toimg → Convierte sticker a imagen (responde al sticker)
│ 🎨 ${PREFIX}sticker → Convierte imagen a sticker (opcional)
╰────────────────────────────╯

╭─⭑ *𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋* 🧠
│ 🤖 ${PREFIX}ia <pregunta> → Pregunta a Levi-IA
│ 💬 ${PREFIX}chatgpt <pregunta> → Alias de IA
│ ⚡ ${PREFIX}gpt <pregunta> → Alias corto
╰────────────────────────────╯

╭─⭑ *𝐏𝐄𝐑𝐅𝐈𝐋𝐄𝐒 𝐘 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐎* 🧾
│ 🧍 ${PREFIX}reg <nombre> <edad> <género> → Crear perfil
│ 👤 ${PREFIX}perfil → Ver tus datos registrados
│ 🗑️ ${PREFIX}eliminarperfil → Eliminar perfil
╰────────────────────────────╯

╭─⭑ *𝐀𝐕𝐄𝐍𝐓𝐔𝐑𝐀 𝐘 𝐑𝐏𝐆* ⚔️
│ ✦ ${PREFIX}trabajar → Gana oro 💰
│ ✦ ${PREFIX}cazar → Obtén experiencia 🏹
│ ✦ ${PREFIX}perfilrpg → Muestra tu progreso 🏰
│ ✦ ${PREFIX}clase → Elige tu clase (guerrero/mago/arquero) 🎭
│ ✦ ${PREFIX}reiniciarrpg → Reinicia tu progreso ♻️
╰────────────────────────────╯

╭─⭑ *𝐏𝐑𝐔𝐄𝐁𝐀𝐒* ⚔️
│ ✦ ${PREFIX}rankcoins
│ ✦ ${PREFIX}ranknivel
│ ✦ ${PREFIX}INFO
╰────────────────────────────╯

${FOOTER}
`;

  await sock.sendMessage(
    from,
    {
      image: { url: pfp },
      caption: banner + secciones,
      mentions: [sender],
    },
    { quoted: m }
  );
  break;
}

// 🏓 PING con latencia
case "ping":
case "p": {
  const start = Date.now();
  const sent = await sock.sendMessage(
    from,
    { text: "🏓 Calculando..." },
    { quoted: m }
  );
  const latency = Date.now() - start;

  // Editar el mensaje con el resultado real
  await sock.sendMessage(from, {
    text:
      `🏓 *PONG!*\n\n` +
      `⚡ *Latencia:* ${latency} ms\n` +
      `📡 *Servidor:* WhatsApp MD\n` +
      `🤖 *Bot:* ${BOT_NAME}\n` +
      `📦 *Versión:* ${VERSION}\n\n` +
      `${FOOTER}`,
    edit: sent.key
  });

  break;
}
// 🖼️ Convertir sticker a imagen
case "toimg":
case "s2i":
case "sticker2img":
case "img": {
  // Buscar el mensaje citado (al que el usuario respondió)
  const quoted =
    m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    m.message?.imageMessage?.contextInfo?.quotedMessage ||
    m.message?.videoMessage?.contextInfo?.quotedMessage;

  if (!quoted) {
    return enviartexto(
      `❌ *Uso correcto:*\n` +
      `1️⃣ Envía o recibe un sticker\n` +
      `2️⃣ Responde a ese sticker con *${PREFIX}toimg*\n\n` +
      `Ejemplo: (responder sticker) → ${PREFIX}toimg`
    );
  }

  // Verificar que el citado sea un sticker
  const stickerMsg = quoted.stickerMessage;
  if (!stickerMsg) {
    return enviartexto("❌ El mensaje citado *no es un sticker*. Responde directamente al sticker.");
  }

  // Los stickers animados (webp animado) no se pueden convertir a imagen estática
  if (stickerMsg.isAnimated) {
    return enviartexto(
      "❌ Los *stickers animados* no se pueden convertir a imagen estática.\n" +
      "Prueba con un sticker normal."
    );
  }

  await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

  try {
    // Descargar el buffer del sticker
    const buffer = await downloadMediaMessage(
      { key: m.key, message: quoted },
      "buffer",
      {},
      {
        logger: pino({ level: "silent" }),
        reuploadRequest: sock.updateMediaMessage
      }
    );

    if (!buffer || buffer.length === 0) {
      throw new Error("Buffer vacío al descargar el sticker");
    }

    // Convertir webp → png con fondo transparente preservado
    const pngBuffer = await sharp(buffer)
      .png({ quality: 100 })
      .toBuffer();

    // Enviar como imagen
    await sock.sendMessage(
      from,
      {
        image: pngBuffer,
        caption: `🖼️ *Sticker convertido a imagen*\n\n${FOOTER}`,
        mimetype: "image/png"
      },
      { quoted: m }
    );

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  } catch (err) {
    console.error("Error en #toimg:", err);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    await enviartexto(
      `⚠️ No se pudo convertir el sticker.\n` +
      `_Motivo:_ ${err.message}`
    );
  }

  break;
}
// 🧠 IA — Inteligencia Artificial (Levi-Bot)
case "ia":
case "chatgpt":
case "gpt": {
  const text = args.join(" ").trim();

  if (!text) {
    return enviartexto(
      `✧ *${BOT_NAME}* ✧\n\n` +
      `Escribe una *petición* después del comando.\n\n` +
      `Ejemplo: ${PREFIX}ia ¿Qué es el amor?`
    );
  }

  const username = m.pushName || "Usuario";
  const basePrompt =
    `Eres Levi-Bot, un asistente creado por Jeferson Fernandez en colaboración con Sergio Gomez Gort. ` +
    `Responde de forma clara, creativa y útil, con un tono amable y un toque de anime. ` +
    `Pregunta del usuario: ${text}`;

  // ⏳ Mensaje de "pensando..."
  const waitMsg = await sock.sendMessage(
    from,
    { text: `⏳ *${BOT_NAME}* está pensando...` },
    { quoted: m }
  );

  try {
    let responseText = null;

    // 1️⃣ Intento principal: siputzx (antiguo luminsesi)
    try {
      const res = await fetch("https://ai.siputzx.my.id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          user: username,
          prompt: basePrompt,
          webSearchMode: false
        })
      });
      const json = await res.json();
      responseText = json?.result;
    } catch (err) {
      console.error("Error siputzx:", err.message);
    }

    // 2️⃣ Fallback: stellar
    if (!responseText) {
      try {
        const url =
          `https://api.stellarwa.xyz/ai/gptprompt` +
          `?text=${encodeURIComponent(text)}` +
          `&prompt=${encodeURIComponent(basePrompt)}` +
          `&key=YukiWaBot`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.result?.text) responseText = json.result.text;
        else if (json?.result) responseText = json.result;
        else if (json?.results) responseText = json.results;
      } catch (err) {
        console.error("Error stellar:", err.message);
      }
    }

    // ❌ Sin respuesta
    if (!responseText) {
      await sock.sendMessage(from, {
        text: "❌ No se pudo obtener una respuesta válida. Intenta más tarde.",
        edit: waitMsg.key
      });
      return;
    }

    // ✅ Editar el mensaje de espera con la respuesta
    await sock.sendMessage(from, {
      text: `${responseText.trim()}\n\n${FOOTER}`,
      edit: waitMsg.key
    });

  } catch (error) {
    console.error("Error en #ia:", error);
    try {
      await sock.sendMessage(from, {
        text: `⚠️ Error inesperado: ${error.message}`,
        edit: waitMsg.key
      });
    } catch {}
  }

  break;
}
      case "info": {
        await enviartexto(
          `🤖 *${BOT_NAME}*\n📦 Versión: ${VERSION}\n👑 Owner: ${OWNER_NAME}\n📱 wa.me/${OWNER_NUMBER}\n\n${FOOTER}`
        );
        break;
      }
// 📝 Registro de usuario
case "reg": {
  const [nombre, edad, genero] = args;
  if (!nombre || !edad || !genero)
    return enviartexto(`⚔️ Ejemplo: ${PREFIX}reg Levi 22 M`);
  if (regix[sender])
    return enviartexto("⚠️ Ya estás registrado. Usa #perfil para ver tus datos.");

  const fecha = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
  const numero = sender.split("@")[0];
  regix[sender] = { id: sender, numero, nombre, edad, genero: genero.toUpperCase(), fecha };
  dowani();

  const textoReg = `
╭─╼┈━༻ ⚔️ *REGISTRO COMPLETADO* ⚔️ ༺━┈╾─╮
│  ✨ *Bienvenido @${numero}*
│  Has sido registrado exitosamente.
│
│  💬 *Nombre:* ${nombre}
│  🎂 *Edad:* ${edad}
│  ⚧ *Género:* ${genero.toUpperCase()}
│  📅 *Fecha:* ${fecha}
╰────────────────────────────╯

${FOOTER}
`.trim();

  await sock.sendMessage(from, { text: textoReg, mentions: [sender] }, { quoted: m });
  break;
}


// 🗑️ Eliminar perfil
case "eliminarperfil": {
  if (!regix[sender]) return enviartexto("🍒 No estás registrado.");
  delete regix[sender];
  dowani();
  await sock.sendMessage(from, { text: `🫐 @${sender.split("@")[0]}, tu perfil ha sido eliminado correctamente.`, mentions: [sender] }, { quoted: m });
  break;
}

      case "trabajar": {
  if (!rpg[sender]) {
    rpg[sender] = { oro: 0, exp: 0, nivel: 1, lastWork: 0 };
  }

  const now = Date.now();
  const cooldown = 5 * 60 * 1000; // 5 minutos

  // ⏳ Cooldown
  if (now - (rpg[sender].lastWork || 0) < cooldown) {
    const remain = cooldown - (now - rpg[sender].lastWork);
    const minutos = Math.floor(remain / (1000 * 60));
    const segundos = Math.floor((remain % (1000 * 60)) / 1000);
    await enviartexto(
      `⌛ Ya trabajaste hace poco.\n` +
      `Vuelve en *${minutos}m ${segundos}s*.`
    );
    break;
  }

  // Lista de trabajos posibles
  const trabajos = [
    "mercader del gremio",
    "forjador de espadas",
    "aventurero errante",
    "alquimista aprendiz",
    "minero de rubíes",
    "vigilante del reino",
    "cazador de monstruos",
    "mago de apoyo"
  ];
  const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];

  // 🎲 Probabilidad de éxito o fallo
  const suerte = Math.random(); // 0.0 – 1.0

  let oroGanado = 0;
  let expGanada = 0;
  let mensajeResultado = "";

  if (suerte < 0.7) {
    // ✅ Éxito: gana dinero
    oroGanado = Math.floor(Math.random() * 35000) + 250000; // 35,000 – 250,00
    expGanada = Math.floor(Math.random() * 50) + 25; // 25 – 75 exp
    rpg[sender].oro += oroGanado;
    rpg[sender].exp += expGanada;
    mensajeResultado =
      `✨ *Buen trabajo como ${trabajo}.*\n` +
      `Has ganado *¥${oroGanado.toLocaleString()}* y *${expGanada} exp.*`;
  } else {
    // ❌ Fracaso: pierde dinero
    const perdida = Math.floor(Math.random() * 20000) + 5000; // 5k – 25k
    rpg[sender].oro = Math.max(0, rpg[sender].oro - perdida);
    expGanada = Math.floor(Math.random() * 10) + 5; // algo de experiencia
    rpg[sender].exp += expGanada;
    mensajeResultado =
      `💢 *El trabajo como ${trabajo} salió mal...*\n` +
      `Perdiste *¥${perdida.toLocaleString()}* en daños y solo obtuviste *${expGanada} exp.*`;
  }

  // 🧾 Actualiza último trabajo
  rpg[sender].lastWork = now;
  saveRPG();

  // 📜 Mensaje final (tono apagado y elegante)
  await enviartexto(
    `${mensajeResultado}\n\n` +
    `💰 Balance actual: *¥${rpg[sender].oro.toLocaleString()}*\n` +
    `🏷️ Nivel: *${rpg[sender].nivel}*\n` +
    `${FOOTER}`
  );

  break;
  }
     // 🧾 Ver perfil completo (Información + RPG)
case "perfil": {
  const levi = regix[sender];
  if (!levi)
    return enviartexto(`❗ No estás registrado. Usa ${PREFIX}reg para hacerlo.`);

  // Datos RPG
  const datos = rpgDB[sender] || { coins: 0, exp: 0, nivel: 1, clase: "Novato" };

  // Obtener foto de perfil
  let pfp;
  try {
    pfp = await sock.profilePictureUrl(sender, "image");
  } catch {
    pfp = "https://i.postimg.cc/9fnHnptg/1761824297335.jpg";
  }

  // Cálculo de nivel y barra XP
  const nivelMaxXP = datos.nivel * 100;
  const progreso = Math.min(10, Math.floor((datos.exp / nivelMaxXP) * 10));
  const barraXP = "▰".repeat(progreso) + "▱".repeat(10 - progreso);

  // Texto del perfil
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
│ 💰 *Coins:* ${datos.coins} 🪙
╰────────────────────────────╯

${FOOTER}
`.trim();

  await sock.sendMessage(
    from,
    {
      image: { url: pfp },
      caption: textoPerfil,
      mentions: [sender],
    },
    { quoted: m }
  );
  break;
}


      case "cazar": {
        if (!rpg[sender]) rpg[sender] = { oro: 0, exp: 0, nivel: 1 };
        const expGanada = Math.floor(Math.random() * 40) + 10;
        rpg[sender].exp += expGanada;
        if (rpg[sender].exp >= 100) {
          rpg[sender].nivel++;
          rpg[sender].exp -= 100;
          await enviartexto(`⚡ *Subiste al nivel ${rpg[sender].nivel}!* 🥳`);
        } else {
          await enviartexto(`🏹 *Cazaste un monstruo y ganaste ${expGanada} de experiencia.* ⭐`);
        }
        saveRPG();
        break;
      }



      case "reiniciarrpg": {
        if (!rpg[sender]) return enviartexto("❌ No tienes datos RPG guardados.");
        delete rpg[sender];
        saveRPG();
        await enviartexto("♻️ *Tu progreso RPG ha sido reiniciado.*");
        break;
      }

      case "clase": {
        const opciones = ["guerrero", "mago", "arquero"];
        const eleccion = args[0]?.toLowerCase();
        if (!rpg[sender]) rpg[sender] = { oro: 0, exp: 0, nivel: 1, clase: null };

        if (!eleccion)
          return enviartexto(`🎭 *Elige tu clase RPG:*\n\n⚔️ #clase guerrero\n🔮 #clase mago\n🏹 #clase arquero`);

        if (!opciones.includes(eleccion))
          return enviartexto("❌ Clase no válida. Usa una de estas: guerrero, mago, arquero.");

        rpg[sender].clase = eleccion.charAt(0).toUpperCase() + eleccion.slice(1);
        saveRPG();

        const descripciones = {
          guerrero: "⚔️ *Guerrero:* Fuerte y valiente, domina el combate cuerpo a cuerpo.",
          mago: "🔮 *Mago:* Usa su sabiduría para controlar el poder de la magia.",
          arquero: "🏹 *Arquero:* Rápido y preciso, experto en ataques a distancia."
        };

        await enviartexto(`✨ Has elegido la clase: *${rpg[sender].clase}*\n\n${descripciones[eleccion]}`);
        break;
      }

      // 💰 SISTEMA DE COINS — LEVI-BOT
case "coins":
case "balance":
case "bal": {
  if (!rpg[sender]) rpg[sender] = { coins: 0, oro: 0, exp: 0, nivel: 1 };

  const user = rpg[sender];
  const coins = user.coins || user.oro || 0;
  const nivel = user.nivel || 1;
  const exp = user.exp || 0;

  // 💎 Estilo visual mejorado
  const mensaje =
`╭───「 *💰 Balance Actual* 」
│
│ 💳 *Usuario:* @${sender.split("@")[0]}
│ 🏅 *Nivel:* ${nivel}
│ 📈 *Exp:* ${exp.toLocaleString()}
│ 💎 *Riqueza:* ¥${coins.toLocaleString()}
│
╰───────────────────────
${FOOTER}`;

  await sock.sendMessage(from, { text: mensaje, mentions: [sender] }, { quoted: m });
  break;
}

case "daily":
case "diario": {
  // 📂 Verificar usuario
  if (!rpg[sender]) {
    rpg[sender] = { coins: 0, lastDaily: 0, streak: 0 };
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // 🕒 Cooldown de 24 horas
  const timeSinceLast = now - (rpg[sender].lastDaily || 0);
  if (timeSinceLast < DAY) {
    const remain = DAY - timeSinceLast;
    const horas = Math.floor(remain / (1000 * 60 * 60));
    const minutos = Math.floor((remain % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((remain % (1000 * 60)) / 1000);

    await enviartexto(
      `《✧》Ya has reclamado tu *Daily* de hoy.\n` +
      `> Puedes reclamarlo de nuevo en *${horas} horas ${minutos} minutos ${segundos} segundos* ⏳`
    );
    break;
  }

  // 🔥 Racha y bonificación
  const missedDays = timeSinceLast > DAY * 2;
  if (missedDays) {
    rpg[sender].streak = 1;
  } else {
    rpg[sender].streak = (rpg[sender].streak || 0) + 1;
  }

  // 💰 Cálculo de recompensa
  const BASE_REWARD = 30000; // ¥30,000 base
  const BONUS = 1 + 0.15 * (rpg[sender].streak - 1);
  const reward = Math.floor(BASE_REWARD * BONUS);

  // 📈 Actualizar datos del usuario
  rpg[sender].coins = (rpg[sender].coins || 0) + reward;
  rpg[sender].lastDaily = now;
  saveRPG();

  const nextReward = Math.floor(BASE_REWARD * (1 + 0.15 * rpg[sender].streak));
  const lostStreak = missedDays ? "☆ ¡Has perdido tu racha anterior!" : "";
  const streakEmoji = rpg[sender].streak >= 7 ? "🔥" : "🌸";

  const rewardFmt = reward.toLocaleString();
  const nextFmt = nextReward.toLocaleString();
  const balanceFmt = rpg[sender].coins.toLocaleString();

  // 🌸 Mensaje con estilo
  await enviartexto(
    `「✿」*Recompensa Diaria*\n\n` +
    `${streakEmoji} ¡Has reclamado *¥${rewardFmt} joyas 💍*! (Día *${rpg[sender].streak}*)\n` +
    `> Día *${rpg[sender].streak + 1}* » *+¥${nextFmt}*\n` +
    `${lostStreak}\n\n` +
    `💰 *Balance total:* ¥${balanceFmt}\n` +
    `${FOOTER}`
  );

  break;
}

case "work":
case "trabajar": {
  if (!rpg[sender]) rpg[sender] = { coins: 0, lastWork: 0 };
  const now = Date.now();
  const cooldown = 5 * 60 * 1000; // 5 minutos

  // ⏳ Cooldown
  if (now - (rpg[sender].lastWork || 0) < cooldown) {
    const remain = cooldown - (now - rpg[sender].lastWork);
    const minutos = Math.floor(remain / (1000 * 60));
    const segundos = Math.floor((remain % (1000 * 60)) / 1000);
    await enviartexto(
      `⏳ Ya trabajaste recientemente.\n` +
      `Vuelve en *${minutos}m ${segundos}s* 🔔`
    );
    break;
  }

  // 🎲 Posible ganancia o pérdida
  const suerte = Math.random();
  let reward = 0;
  let mensaje = "";

  // ✿ Frases aleatorias (ganar)
  const frasesGanar = [
    "✿ Ayudaste a un aldeano con sus cosechas y te recompensó con *¥{monto} coins 💷*.",
    "✿ Trabajaste como herrero y vendiste una espada por *¥{monto} coins 💷*.",
    "✿ Cazaste un monstruo y te pagaron *¥{monto} coins 💷* por su cabeza.",
    "✿ Hiciste un trabajo de programación y te transfirieron *¥{monto} coins 💷*.",
    "✿ Limpiaste el gremio y los aventureros te dieron propina de *¥{monto} coins 💷*.",
    "✿ Vendiste un hechizo experimental por *¥{monto} coins 💷*.",
    "✿ Ayudaste a un mago anciano y te bendijo con *¥{monto} coins 💷*.",
    "✿ Te uniste a una marcha solidaria y recibiste un plan de *¥{monto} coins 💷*.",
    "✿ El gremio te reconoció y te pagó *¥{monto} coins 💷* por tus logros.",
    "✿ Participaste en una subasta y saliste ganando *¥{monto} coins 💷*."
  ];

  // 💢 Frases aleatorias (perder)
  const frasesPerder = [
    "✿ Te timaron en una apuesta y perdiste *¥{monto} coins 💷*.",
    "✿ Tu invento explotó y tuviste que pagar daños por *¥{monto} coins 💷*.",
    "✿ Fuiste a trabajar pero terminaste dormido, perdiste *¥{monto} coins 💷* en multas.",
    "✿ Un ladrón te robó *¥{monto} coins 💷* mientras ibas al trabajo.",
    "✿ No trabajaste y gastaste *¥{monto} coins 💷* en comida y bebidas.",
    "✿ Tu jefe te descontó *¥{monto} coins 💷* por llegar tarde.",
    "✿ El gremio te sancionó con una multa de *¥{monto} coins 💷*.",
    "✿ El dragón que cazabas te robó *¥{monto} coins 💷* de tu bolsa.",
    "✿ Tu espada se rompió y tuviste que pagar *¥{monto} coins 💷* para repararla.",
    "✿ Te despidieron y perdiste *¥{monto} coins 💷* en gastos innecesarios."
  ];

  if (suerte < 0.7) {
    // 🟩 Ganancia
    reward = Math.floor(Math.random() * 35000) + 35000; // 35k – 70k
    const frase = frasesGanar[Math.floor(Math.random() * frasesGanar.length)];
    mensaje = frase.replace("{monto}", reward.toLocaleString());
    rpg[sender].coins += reward;
  } else {
    // 🟥 Pérdida
    reward = Math.floor(Math.random() * 20000) + 5000; // 5k – 25k
    const frase = frasesPerder[Math.floor(Math.random() * frasesPerder.length)];
    mensaje = frase.replace("{monto}", reward.toLocaleString());
    rpg[sender].coins = Math.max(0, rpg[sender].coins - reward);
  }

  // 💾 Guardar progreso
  rpg[sender].lastWork = now;
  saveRPG();

  // 💬 Mensaje final estilo Levi
  await enviartexto(
`「✿」${mensaje}
> 💰 Balance actual: *¥${rpg[sender].coins.toLocaleString()} coins 💷*
${FOOTER}`
  );

  break;
}

// 🪙 Top de usuarios con más coins (solo admins)
case "rankcoins": {
  // Si está en grupo, verificar admin
  if (isGroup) {
    const groupMetadata = await sock.groupMetadata(from);
    const admins = groupMetadata.participants
      .filter(p => p.admin)
      .map(p => p.id);

    if (!admins.includes(sender)) {
      return enviartexto("⚠️ Este comando solo puede ser usado por *administradores del grupo*.");
    }
  }

  const ranking = Object.entries(rpgDB)
    .map(([id, data]) => ({
      id,
      nombre: regix[id]?.nombre || "Desconocido",
      coins: data.coins || 0,
    }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  if (ranking.length === 0)
    return enviartexto("❌ No hay jugadores registrados en el sistema RPG.");

  let texto = `🏆 *TOP 10 - USUARIOS CON MÁS COINS* 🪙\n\n`;
  ranking.forEach((u, i) => {
    const numero = u.id.split("@")[0];
    const esTuyo = u.id === sender ? "👑 (Tú)" : "";
    texto += `*${i + 1}.* ${u.nombre} (${numero}) — *${u.coins} coins* ${esTuyo}\n`;
  });

  await sock.sendMessage(from, { text: texto.trim(), mentions: [sender] }, { quoted: m });
  break;
}

// ⚔️ Top de usuarios con más nivel (solo admins)
case "ranknivel": {
  if (isGroup) {
    const groupMetadata = await sock.groupMetadata(from);
    const admins = groupMetadata.participants
      .filter(p => p.admin)
      .map(p => p.id);

    if (!admins.includes(sender)) {
      return enviartexto("⚠️ Este comando solo puede ser usado por *administradores del grupo*.");
    }
  }

  const ranking = Object.entries(rpgDB)
    .map(([id, data]) => ({
      id,
      nombre: regix[id]?.nombre || "Desconocido",
      nivel: data.nivel || 1,
      exp: data.exp || 0,
      clase: data.clase || "Novato",
    }))
    .sort((a, b) => (b.nivel === a.nivel ? b.exp - a.exp : b.nivel - a.nivel))
    .slice(0, 10);

  if (ranking.length === 0)
    return enviartexto("❌ No hay jugadores registrados en el sistema RPG.");

  let texto = `⚔️ *TOP 10 - JUGADORES CON MÁS NIVEL* 💫\n\n`;
  ranking.forEach((u, i) => {
    const numero = u.id.split("@")[0];
    const esTuyo = u.id === sender ? "👑 (Tú)" : "";
    texto += `*${i + 1}.* ${u.nombre} (${numero}) — *Nivel ${u.nivel}* [${u.clase}] ${esTuyo}\n`;
  });

  await sock.sendMessage(from, { text: texto.trim(), mentions: [sender] }, { quoted: m });
  break;
}
// 📌 Pinterest — buscar y enviar imagen
case "pinterest":
case "pin": {
  const query = args.join(" ").trim();

  if (!query) {
    return enviartexto(
      `❌ Uso: ${PREFIX}pinterest <búsqueda>\n` +
      `Ejemplo: ${PREFIX}pinterest atardecer`
    );
  }

  await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
  const waitMsg = await sock.sendMessage(
    from,
    { text: `🔍 Buscando en Pinterest: *${query}*...` },
    { quoted: m }
  );

  // 🌐 Lista de APIs (se prueban en orden hasta que una responda)
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
      const res = await fetch(url, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (!res.ok) continue;

      const data = await res.json();
      let extractedUrl = null;

      if (url.includes("tester-web")) {
        if (data.results && data.results.length > 0) {
          extractedUrl = data.results[0].descarga || data.results[0].url;
        }
      } else if (data.result && Array.isArray(data.result) && data.result[0]) {
        extractedUrl = data.result[0].url || data.result[0].image || data.result[0].thumbnail;
      } else if (data.data && Array.isArray(data.data) && data.data[0]) {
        extractedUrl = data.data[0].url || data.data[0].image;
      } else if (data.images && data.images[0]) {
        extractedUrl = data.images[0];
      } else if (data.url) {
        extractedUrl = data.url;
      } else if (data.image) {
        extractedUrl = data.image;
      }

      if (
        extractedUrl &&
        (extractedUrl.startsWith("http://") || extractedUrl.startsWith("https://"))
      ) {
        mediaUrl = extractedUrl;
        break;
      }
    } catch (err) {
      console.error(`Error API Pinterest (${url}): ${err.message}`);
    }
  }

  // 🧹 Borrar el mensaje de "buscando..."
  try {
    await sock.sendMessage(from, { delete: waitMsg.key });
  } catch {}

  if (!mediaUrl) {
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return enviartexto(
      `❌ No se encontraron resultados para "*${query}*". Intenta con otra búsqueda.`
    );
  }

  const isVideo = /\.(mp4|webm|mov)$/i.test(mediaUrl);
  const caption = `📌 *Resultado de Pinterest:* ${query}\n\n${FOOTER}`;

  try {
    if (isVideo) {
      await sock.sendMessage(
        from,
        { video: { url: mediaUrl }, caption, mimetype: "video/mp4" },
        { quoted: m }
      );
    } else {
      await sock.sendMessage(
        from,
        { image: { url: mediaUrl }, caption },
        { quoted: m }
      );
    }
    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  } catch (err) {
    console.error("Error enviando media de Pinterest:", err);
    await enviartexto(
      `⚠️ Se encontró el resultado pero no se pudo enviar.\n🔗 URL: ${mediaUrl}`
    );
  }

  break;
}
    case "play": {
  if (!args[0]) return enviartexto(`✳️ Ejemplo:\n${PREFIX + comando} jalebi baby`);

  const query = args.join(" ");
  const SEARCH_API = `https://yt-search-api-tau.vercel.app/search?query=${encodeURIComponent(query)}`;
  const DOWNLOAD_API = "https://youtube-download-api.matheusishiyama.repl.co";

  try {
    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // 🔍 Buscar video en YouTube
    const searchRes = await fetch(SEARCH_API);
    const searchData = await searchRes.json();

    if (!searchData || !searchData.videos || !searchData.videos.length)
      return enviartexto("❌ No se encontraron resultados.");

    // 🏆 Primer resultado
    const video = searchData.videos[0];
    const ytUrl = video.url;

    // 🎧 Obtener info del video
    const infoRes = await fetch(`${DOWNLOAD_API}/info/?url=${encodeURIComponent(ytUrl)}`);
    const info = await infoRes.json();

    if (!info.title) return enviartexto("❌ No se pudo obtener información del video.");

    const caption = `🎵 *${info.title}*\n📺 ${ytUrl}\n\n💿 Descargando tu música...`;

    // 🖼️ Enviar miniatura
    await sock.sendMessage(from, {
      image: { url: info.thumbnail },
      caption,
    }, { quoted: m });

    // 🎶 Enviar el audio
    await sock.sendMessage(from, {
      audio: { url: `${DOWNLOAD_API}/mp3/?url=${encodeURIComponent(ytUrl)}` },
      mimetype: "audio/mpeg",
      fileName: `${info.title}.mp3`
    }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("Error en comando play:", err);
    enviartexto("❌ Error al procesar la música. Intenta con otro nombre.");
  }

  break;
}
      default:
        await enviartexto(`❓ Comando no reconocido. Usa
> ${PREFIX}menu para ver las opciones.`);
        break;
    }
  });
}

// 🧾 Pedir número para vincular
function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(promptText, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// 🚀 Iniciar el bot
startLevi();
    
