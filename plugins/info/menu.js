import fs from "fs";

export default {
  command: ["menu", "help", "menú", "ayuda"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX, db } = ctx;
    
    const numero = sender.split("@")[0];
    const localImagePath = "/storage/emulated/0/Pictures/WhatsApp/IMG-20261103-WA0027.jpg";

    // Verificar si la imagen existe
    if (!fs.existsSync(localImagePath)) {
      return enviartexto("❌ No se encontró la imagen del menú en la ruta especificada.");
    }

    // 📊 Obtener cantidad de usuarios registrados en la Base de Datos
    const totalUsers = Object.keys(db.users || {}).length;

    const CANAL_JID = "120363415858789528@newsletter";
    const CANAL_URL = "https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d";
    const CANAL_NOMBRE = "⍪❖Ƭʜᴇ Kakashi—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const GRUPO = "https://chat.whatsapp.com/FAWaPaXIcbpLxpcq823WiE";

    const header = `
╭━━━━━━━━━━━━━━━━━━╮
┃      🐾  𝐋𝐄𝐕𝐈 - 𝐁𝐎𝐓  🐾          ┃
╰━━━━━━━━━━━━━━━━━━╯
    ✦ *¡Hola!* @${numero} ✦

┏━━━〔 ⚙️ 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎 〕━━━┓
┃ ✦ *Nombre:* ${BOT_NAME}
┃ ✦ *Tipo:* Multi-Device Modular
┃ ✦ *Versión:* ${config.version}
┃ ✦ *Usuarios:* ${totalUsers} 👥
┃ ✦ *Owner:* ${config.ownerName}
┃ ✦ *Librería:* Baileys
┗━━━━━━━━━━━━━━━━━━┛
> *Tip:* Usa ${PREFIX}code para ser un Sub-Bot
`;

    const secciones = `
┏━━━〔 💰 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 〕━━━┓
┃ ➤ ${PREFIX}work | ${PREFIX}daily
┃ ➤ ${PREFIX}bal | ${PREFIX}rankcoins
┗━━━━━━━━━━━━━━━━━━┛

┏━━━〔 ⚔️ 𝐑𝐏𝐆 〕━━━┓
┃ ➤ ${PREFIX}trabajar
┃ ➤ ${PREFIX}cazar | ${PREFIX}pescar
┃ ➤ ${PREFIX}minar | ${PREFIX}explorar
┃ ➤ ${PREFIX}clase | ${PREFIX}ranknivel
┗━━━━━━━━━━━━━━━━━━┛

┏━━━〔 🌟 𝐏𝐄𝐑𝐅𝐈𝐋 〕━━━┓
┃ ➤ ${PREFIX}reg <nom> <edad> <gen>
┃ ➤ ${PREFIX}perfil
┃ ➤ ${PREFIX}delperfil
┗━━━━━━━━━━━━━━━━━━┛

┏━━━〔 🎄 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 〕━━━┓
┃ ➤ ${PREFIX}play <audio>
┃ ➤ ${PREFIX}pin <búsqueda>
┃ ➤ ${PREFIX}tt <enlace> (TikTok)
┃ ➤ ${PREFIX}fb <enlace> (Facebook)
┃ ➤ ${PREFIX}ytsearch <texto>
┃ ➤ ${PREFIX}toimg (Sticker a Img)
┗━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 ☃️ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒 〕━━━┓
┃ ➤ ${PREFIX}s | ${PREFIX}sticker
┃ ➤ ${PREFIX}brat <texto>
┃ ➤ ${PREFIX}stickers <búsqueda>
┗━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 🧠 𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 〕━━━┓
┃ ➤ ${PREFIX}ia <pregunta>
┃ ➤ ${PREFIX}iaaudio <pregunta>
┃ ➤ ${PREFIX}imagen <prompt>
┗━━━━━━━━━━━━━━━━━━┛

┏━━━〔 🎉 𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎𝐍 〕━━━┓
┃ ➤ ${PREFIX}meme | ${PREFIX}ship
┃ ➤ ${PREFIX}gato | ${PREFIX}perro
┃ ➤ ${PREFIX}waifu | ${PREFIX}neko
┃ ➤ ${PREFIX}8ball <pregunta>
┃ ➤ ${PREFIX}trivia → Jugar trivia
┃ ➤ ${PREFIX}mate → Acertijo matemático
┗━━━━━━━━━━━━━━━━━━┛

┏━━━〔 🔔 𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 〕━━━┓
┃ ➤ ${PREFIX}ping | ${PREFIX}info
┃ ➤ ${PREFIX}creadores | ${PREFIX}prueba
┃ ➤ ${PREFIX}traducir <texto>
┃ ➤ ${PREFIX}clima <ciudad>
┃ ➤ ${PREFIX}wiki <búsqueda>
┃ ➤ ${PREFIX}qr | ${PREFIX}tts
┗━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 👑 𝐀𝐃𝐌𝐈𝐍 〕━━━┓
┃ ➤ ${PREFIX}close | ${PREFIX}open
┃ ➤ ${PREFIX}del (Responde al msg)
┗━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 🤖 𝐒𝐔𝐁-𝐁𝐎𝐓𝐒 〕━━━┓
┃ ➤ ${PREFIX}code (Gratis)
┃ ➤ ${PREFIX}jadibot <num> (Prem)
┃ ➤ ${PREFIX}canjear <código>
┃ ➤ ${PREFIX}stopbot | ${PREFIX}bots
┗━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 ⚙️ 𝐎𝐖𝐍𝐄𝐑 〕━━━┓
┃ ➤ ${PREFIX}fix | ${PREFIX}backup
┃ ➤ ${PREFIX}restart | ${PREFIX}clear
┃ ➤ ${PREFIX}join <link>
┃ ➤ ${PREFIX}leave (en grupo)
┃ ➤ ${PREFIX}gencode
┃ ➤ ${PREFIX}addpremium | ${PREFIX}delpremium
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━╮
┃  🐾  𝐖𝐲𝐫𝐚 𝐒𝐭𝐮𝐝𝐢𝐨𝐬 𝐏𝐫𝐨𝐣𝐞𝐜𝐭 🐾 ┃
╰━━━━━━━━━━━━━━━━━━━╯
`;

    await sock.sendMessage(from, {
      text: header + secciones,
      mentions: [sender],
      contextInfo: {
        externalAdReply: {
          title: '🐾 Levi-Bot — Menú Principal',
          body: `Usuarios en el sistema: ${totalUsers} | Wyra Studios`,
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
