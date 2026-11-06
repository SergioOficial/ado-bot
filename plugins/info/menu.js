import fs from "fs";
export default {
  command: ["menu", "help"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX } = ctx;
    const numero = sender.split("@")[0];
    const localImagePath = "/storage/emulated/0/Pictures/WhatsApp/IMG-20261103-WA0027.jpg";
    if (!fs.existsSync(localImagePath)) return enviartexto("❌ No se encontró la imagen del menú.");

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
│ ⚙️ *Versión:* ${config.version}
│ 👑 *Owner:* ${config.ownerName}
│ 👥 *Usuarios:* ∞
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
│ 👑 ${PREFIX}creadores → Contactos
│ ♻️ ${PREFIX}fix → Actualizar bot (Owners)
╰────────────────────────────╯

╭─ ☃️ *𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒* 🖌️
│ 🎨 ${PREFIX}sticker / ${PREFIX}s → Crear sticker
│ 🖼️ ${PREFIX}brat <texto> → Sticker Brat
│ 🔎 ${PREFIX}stickers <búsqueda> → Buscar packs
╰────────────────────────────╯

╭─ 🎄 *𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒* 🎨
│ 📌 ${PREFIX}pinterest <búsqueda>
│ 🎵 ${PREFIX}play <canción>
│ 🔍 ${PREFIX}ytsearch <texto>
│ 🖼️ ${PREFIX}toimg → Sticker a imagen
╰────────────────────────────╯

╭─ ☃️ *𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋* 🧠
│ 🤖 ${PREFIX}ia <pregunta>
╰────────────────────────────╯

╭─ 🌟 *𝐏𝐄𝐑𝐅𝐈𝐋𝐄𝐒* 🧾
│ 🧍 ${PREFIX}reg <nombre> <edad> <género>
│ 👤 ${PREFIX}perfil
│ 🗑️ ${PREFIX}eliminarperfil
╰────────────────────────────╯

╭─ ⚔️ *𝐀𝐕𝐄𝐍𝐓𝐔𝐑𝐀 𝐘 𝐑𝐏𝐆* 🏰
│ ✦ ${PREFIX}trabajar
│ ✦ ${PREFIX}cazar
│ ✦ ${PREFIX}clase
╰────────────────────────────╯

╭─ 🤖 *𝐒𝐔𝐁-𝐁𝐎𝐓𝐒* 🦌
│ 🚀 ${PREFIX}jadibot <número>
│ 🛑 ${PREFIX}stopbot
│ 📋 ${PREFIX}bots
╰────────────────────────────╯

🎄 ═══════ 🎅 ═══════ 🎄
   🍪 *¡Feliz Navidad!* 🍪

📢 *Canal oficial:* ${CANAL_URL}
💬 *Grupo:* ${GRUPO}
`;

    await sock.sendMessage(from, {
      text: bannerMenu + secciones,
      mentions: [sender],
      contextInfo: {
        externalAdReply: {
          title: '🎄 Levi-Bot — Menú',
          body: 'Toca aquí para ver el canal oficial',
          image: { url: localImagePath },
          sourceUrl: CANAL_URL,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: true
        },
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: CANAL_JID,
          newsletterName: CANAL_NOMBRE,
          serverMessageId: 1
        }
      }
    }, { quoted: m });
  }
};
