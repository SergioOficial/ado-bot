export default {
  command: ["menu", "help", "menú", "ayuda"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX, db, args } = ctx;
    const numero = sender.split("@")[0];
    const tipo = args[0]?.toLowerCase();
    
    // 👤 Info del usuario
    const user = db.users[sender] || {};
    const totalUsers = Object.keys(db.users || {}).length;
    const esPremium = user.premium === true ? "💎 PREMIUM" : "👤 FREE";
    const nivelUser = user.nivel || 1;
    const rangoTexto = user.nombre ? `Nv. ${nivelUser} | ${esPremium}` : "No registrado";

    const CANAL_JID = "120363415858789528@newsletter";
    const CANAL_NOMBRE = "⍪❖Ƭʜᴇ Kakashi—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const CANAL_URL = "https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d";
    const pfp = "https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg";
    let texto = "";

    // 🌟 MENÚ PRINCIPAL (Todas las secciones visibles)
    if (!tipo) {
      texto = `
⋆｡°✩ 🐾 𝐋𝐄𝐕𝐈 - 𝐁𝐎𝐓 🐾 ✩°｡⋆
✦ *¡Hola,* @${numero} *!*
> *Tu rango:* ${rangoTexto}

┏━━━━━━━━━━━━━━━━━━┓
┃   ⚙️ *𝐈𝐍𝐅𝐎* ⚙️
┣━━━━━━━━━━━━━━━━━━┛
┃ ✦ *Usuarios:* ${totalUsers} 👥
┃ ✦ *Prefijo:* [ ${PREFIX} ]
┃ ✦ *Estado:* Online 🟢
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🎁 *𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀* 🎁
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}work | ${PREFIX}daily
┃ ➤ ${PREFIX}bal | ${PREFIX}rankcoins
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ ⚔️ *𝐑𝐏𝐆* ⚔️
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}trabajar | ${PREFIX}cazar | ${PREFIX}pescar
┃ ➤ ${PREFIX}minar | ${PREFIX}explorar
┃ ➤ ${PREFIX}clase | ${PREFIX}ranknivel
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🌟 *𝐏𝐄𝐑𝐅𝐈𝐋* 🌟
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}reg <nom> <edad> <gen>
┃ ➤ ${PREFIX}perfil | ${PREFIX}delperfil
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🎄 *𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒* 🎄
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}play | ${PREFIX}pin
┃ ➤ ${PREFIX}tt | ${PREFIX}fb
┃ ➤ ${PREFIX}ytsearch | ${PREFIX}toimg
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ ☃️ *𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒* ☃️
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}s | ${PREFIX}brat
┃ ➤ ${PREFIX}stickers
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🧠 *𝐈𝐀* 🧠
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}ia | ${PREFIX}iaaudio
┃ ➤ ${PREFIX}imagen
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🎉 *𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎𝐍* 🎉
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}trivia | ${PREFIX}mate | ${PREFIX}8ball
┃ ➤ ${PREFIX}meme | ${PREFIX}gato | ${PREFIX}perro
┃ ➤ ${PREFIX}waifu | ${PREFIX}neko | ${PREFIX}ship
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🔔 *𝐔𝐓𝐈𝐋𝐒* 🔔
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}ping | ${PREFIX}info | ${PREFIX}creadores
┃ ➤ ${PREFIX}traducir | ${PREFIX}clima
┃ ➤ ${PREFIX}wiki | ${PREFIX}qr | ${PREFIX}tts
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🛡️ *𝐀𝐃𝐌𝐈𝐍* 🛡️
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}close | ${PREFIX}open | ${PREFIX}del
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🤖 *𝐒𝐔𝐁𝐁𝐎𝐓𝐒* 🤖
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}code | ${PREFIX}jadibot
┃ ➤ ${PREFIX}canjear | ${PREFIX}stopbot | ${PREFIX}bots
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 👑 *𝐎𝐖𝐍𝐄𝐑* 👑
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}fix | ${PREFIX}backup | ${PREFIX}restart
┃ ➤ ${PREFIX}join | ${PREFIX}leave | ${PREFIX}gencode
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🧪 *𝐓𝐄𝐒𝐓* 🧪
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}botones
┗━━━━━━━━━━━━━━━━━━┛

> 💡 *Tip:* También puedes usar *${PREFIX}menu <tipo>* (ej: *${PREFIX}menu rpg*) para ver las categorías de forma más limpia.
`;
    } 
    // 🎁 ECONOMÍA (Submenú)
    else if (tipo === 'economia') {
      texto = `
⋆｡°✩ 🎁 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 💵 » ${PREFIX}work
┃ 🎅 » ${PREFIX}daily
┃ 💳 » ${PREFIX}bal
┃ 🏆 » ${PREFIX}rankcoins
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // ⚔️ RPG (Submenú)
    else if (tipo === 'rpg') {
      texto = `
⋆｡°✩ ⚔️ 𝐀𝐕𝐄𝐍𝐓𝐔𝐑𝐀 𝐘 𝐑𝐏𝐆 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🌾 » ${PREFIX}trabajar
┃ 🏹 » ${PREFIX}cazar
┃ 🎣 » ${PREFIX}pescar
┃ ⛏️ » ${PREFIX}minar
┃ 🗺️ » ${PREFIX}explorar
┃ 🎭 » ${PREFIX}clase
┃ 🏅 » ${PREFIX}ranknivel
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🌟 PERFIL (Submenú)
    else if (tipo === 'perfil') {
      texto = `
⋆｡°✩ 🌟 𝐏𝐄𝐑𝐅𝐈𝐋 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🧍 » ${PREFIX}reg <nom> <edad> <gen>
┃ 👤 » ${PREFIX}perfil
┃ 🗑️ » ${PREFIX}delperfil
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🎄 DESCARGAS (Submenú)
    else if (tipo === 'descargas') {
      texto = `
⋆｡°✩ 🎄 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🎵 » ${PREFIX}play <audio>
┃ 📌 » ${PREFIX}pin <búsqueda>
┃ 🎬 » ${PREFIX}tt <enlace>
┃ 📘 » ${PREFIX}fb <enlace>
┃ 🔍 » ${PREFIX}ytsearch <texto>
┃ 🖼️ » ${PREFIX}toimg
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // ☃️ STICKERS (Submenú)
    else if (tipo === 'stickers') {
      texto = `
⋆｡°✩ ☃️ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🎨 » ${PREFIX}s | ${PREFIX}sticker
┃ 🖼️ » ${PREFIX}brat <texto>
┃ 🔎 » ${PREFIX}stickers <busq>
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🧠 IA (Submenú)
    else if (tipo === 'ia') {
      texto = `
⋆｡°✩ 🧠 𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🤖 » ${PREFIX}ia <pregunta>
┃ 🎙️ » ${PREFIX}iaaudio <pregunta>
┃ 🎨 » ${PREFIX}imagen <prompt>
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🎉 FUN (Submenú)
    else if (tipo === 'fun') {
      texto = `
⋆｡°✩ 🎉 𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎𝐍 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🧠 » ${PREFIX}trivia
┃ 🧮 » ${PREFIX}mate
┃ 🎱 » ${PREFIX}8ball <preg>
┃ 😂 » ${PREFIX}meme
┃ 🐱 » ${PREFIX}gato | ${PREFIX}perro
┃ 🌸 » ${PREFIX}waifu | ${PREFIX}neko
┃ 🚢 » ${PREFIX}ship <@user>
┃ 📝 » ${PREFIX}r <respuesta>
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🔔 UTILS (Submenú)
    else if (tipo === 'utils') {
      texto = `
⋆｡°✩ 🔔 𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🏓 » ${PREFIX}ping
┃ ℹ️ » ${PREFIX}info
┃ 👑 » ${PREFIX}creadores
┃ 🌍 » ${PREFIX}traducir <txt>
┃ ⛅ » ${PREFIX}clima <ciudad>
┃ 📚 » ${PREFIX}wiki <busq>
┃ 📱 » ${PREFIX}qr
┃ 🎤 » ${PREFIX}tts <txt>
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🤖 SUBBOTS (Submenú)
    else if (tipo === 'subbots') {
      texto = `
⋆｡°✩ 🤖 𝐒𝐔𝐁-𝐁𝐎𝐓𝐒 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🚀 » ${PREFIX}code (Gratis)
┃ 💎 » ${PREFIX}jadibot (Prem)
┃ 🔑 » ${PREFIX}canjear <código>
┃ 🛑 » ${PREFIX}stopbot
┃ 📋 » ${PREFIX}bots
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 👑 OWNER (Submenú)
    else if (tipo === 'owner') {
      texto = `
⋆｡°✩ 👑 𝐎𝐖𝐍𝐄𝐑 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ ♻️ » ${PREFIX}fix | ${PREFIX}backup
┃ 🔄 » ${PREFIX}restart | ${PREFIX}clear
┃ 🚪 » ${PREFIX}join | ${PREFIX}leave
┃ 🔑 » ${PREFIX}gencode
┃ 💎 » ${PREFIX}addpremium
┃ ❌ » ${PREFIX}delpremium
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🛡️ ADMIN (Submenú)
    else if (tipo === 'admin') {
      texto = `
⋆｡°✩ 🛡️ 𝐀𝐃𝐌𝐈𝐍 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🔒 » ${PREFIX}close
┃ 🔓 » ${PREFIX}open
┃ 🗑️ » ${PREFIX}del
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🧪 TEST (Submenú)
    else if (tipo === 'test') {
      texto = `
⋆｡°✩ 🧪 𝐁𝐎𝐓𝐎𝐍𝐄𝐒 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🧪 » ${PREFIX}botones
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    else {
      return enviartexto(`❌ La categoría *${tipo}* no existe.\nUsa *${PREFIX}menu* para ver las opciones.`);
    }

    // Enviar el menú con la tarjeta de enlace y el canal
    await sock.sendMessage(from, {
      image: {url:pfp},
      caption: texto.trim(),
      mentions: [sender],
      contextInfo: {
        externalAdReply: {
          title: '🐾 Levi-Bot — Menú Oficial',
          body: 'Wyra Studios Project',
          thumbnailUrl: pfp, 
          sourceUrl: CANAL_URL,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: false
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
