export default {
  command: ["menu", "help", "menú", "ayuda"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX, db, args } = ctx;
    const numero = sender.split("@")[0];
    const tipo = args[0]?.toLowerCase();
    const totalUsers = Object.keys(db.users || {}).length;

    const CANAL_JID = "120363415858789528@newsletter";
    const CANAL_NOMBRE = "⍪❖Ƭʜᴇ Kakashi—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const GRUPO = "https://chat.whatsapp.com/FAWaPaXIcbpLxpcq823WiE";
    const CANAL_URL = "https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d";
    
    // Usamos una URL de imagen en lugar de la ruta local para asegurar que se vea en todos los dispositivos
    const pfp = "https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg";

    let texto = "";

    // 🌟 MENÚ PRINCIPAL
    if (!tipo) {
      texto = `
╭─「 🐾 𝐋𝐄𝐕𝐈 - 𝐁𝐎𝐓 」─╮
│ Hola @${numero}, soy ${BOT_NAME}
│ 👥 Usuarios: ${totalUsers}
│ ⚙️ Prefix: ${PREFIX}
│ 🟢 Estado: Online
╰──────────────────────╯

╭─「 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 」─╮
│ 🎁 ${PREFIX}menu economia
│ ⚔️ ${PREFIX}menu rpg
│ 🌟 ${PREFIX}menu perfil
│ 🎄 ${PREFIX}menu descargas
│ ☃️ ${PREFIX}menu stickers
│ 🧠 ${PREFIX}menu ia
│ 🎉 ${PREFIX}menu fun
│ 🔔 ${PREFIX}menu utils
│ 🤖 ${PREFIX}menu subbots
│ 👑 ${PREFIX}menu owner
│ 🛡️ ${PREFIX}menu admin
╰──────────────────────╯

> 💡 Usa *${PREFIX}menu <categoría>* para ver los comandos.
> Ejemplo: *${PREFIX}menu economia*
`;
    } 
    // 🎁 ECONOMÍA
    else if (tipo === 'economia') {
      texto = `
╭─「 🎁 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 」─╮
│ ➤ ${PREFIX}work
│ ➤ ${PREFIX}daily
│ ➤ ${PREFIX}bal
│ ➤ ${PREFIX}rankcoins
╰────────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // ⚔️ RPG
    else if (tipo === 'rpg') {
      texto = `
╭─「 ⚔️ 𝐀𝐕𝐄𝐍𝐓𝐔𝐑𝐀 𝐘 𝐑𝐏𝐆 」─╮
│ ➤ ${PREFIX}trabajar
│ ➤ ${PREFIX}cazar
│ ➤ ${PREFIX}pescar
│ ➤ ${PREFIX}minar
│ ➤ ${PREFIX}explorar
│ ➤ ${PREFIX}clase
│ ➤ ${PREFIX}ranknivel
╰──────────────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🌟 PERFIL
    else if (tipo === 'perfil') {
      texto = `
╭─「 🌟 𝐏𝐄𝐑𝐅𝐈𝐋 」─╮
│ ➤ ${PREFIX}reg <nombre> <edad> <M/F>
│ ➤ ${PREFIX}perfil
│ ➤ ${PREFIX}delperfil
╰──────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🎄 DESCARGAS
    else if (tipo === 'descargas') {
      texto = `
╭─「 🎄 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 」─╮
│ ➤ ${PREFIX}play <canción>
│ ➤ ${PREFIX}pin <búsqueda>
│ ➤ ${PREFIX}tt <enlace>
│ ➤ ${PREFIX}fb <enlace>
│ ➤ ${PREFIX}ytsearch <texto>
│ ➤ ${PREFIX}toimg (Sticker a Img)
╰────────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // ☃️ STICKERS
    else if (tipo === 'stickers') {
      texto = `
╭─「 ☃️ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒 」─╮
│ ➤ ${PREFIX}s | ${PREFIX}sticker
│ ➤ ${PREFIX}brat <texto>
│ ➤ ${PREFIX}stickers <búsqueda>
╰───────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🧠 IA
    else if (tipo === 'ia') {
      texto = `
╭─「 🧠 𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 」─╮
│ ➤ ${PREFIX}ia <pregunta>
│ ➤ ${PREFIX}iaaudio <pregunta>
│ ➤ ${PREFIX}imagen <prompt>
╰────────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🎉 DIVERSIÓN
    else if (tipo === 'fun') {
      texto = `
╭─「 🎉 𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎𝐍 」─╮
│ ➤ ${PREFIX}trivia
│ ➤ ${PREFIX}mate
│ ➤ ${PREFIX}8ball <pregunta>
│ ➤ ${PREFIX}meme
│ ➤ ${PREFIX}gato | ${PREFIX}perro
│ ➤ ${PREFIX}waifu | ${PREFIX}neko
│ ➤ ${PREFIX}ship <@user>
│ ➤ ${PREFIX}r <respuesta> (Trivia)
╰──────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🔔 UTILIDADES
    else if (tipo === 'utils') {
      texto = `
╭─「 🔔 𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 」─╮
│ ➤ ${PREFIX}ping | ${PREFIX}info
│ ➤ ${PREFIX}creadores | ${PREFIX}reporte
│ ➤ ${PREFIX}traducir <texto>
│ ➤ ${PREFIX}clima <ciudad>
│ ➤ ${PREFIX}wiki <búsqueda>
│ ➤ ${PREFIX}qr | ${PREFIX}tts
╰────────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🤖 SUBBOTS
    else if (tipo === 'subbots') {
      texto = `
╭─「 🤖 𝐒𝐔𝐁-𝐁𝐎𝐓𝐒 」─╮
│ ➤ ${PREFIX}code (Gratis)
│ ➤ ${PREFIX}jadibot <num> (Prem)
│ ➤ ${PREFIX}canjear <código>
│ ➤ ${PREFIX}stopbot
│ ➤ ${PREFIX}bots
╰──────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 👑 OWNER
    else if (tipo === 'owner') {
      texto = `
╭─「 👑 𝐎𝐖𝐍𝐄𝐑 」─╮
│ ➤ ${PREFIX}fix | ${PREFIX}backup
│ ➤ ${PREFIX}restart | ${PREFIX}clear
│ ➤ ${PREFIX}join <link> | ${PREFIX}leave
│ ➤ ${PREFIX}gencode
│ ➤ ${PREFIX}addpremium | ${PREFIX}delpremium
╰─────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    }
    // 🛡️ ADMIN
    else if (tipo === 'admin') {
      texto = `
╭─「 🛡️ 𝐀𝐃𝐌𝐈𝐍 」─╮
│ ➤ ${PREFIX}close (Cerrar grupo)
│ ➤ ${PREFIX}open (Abrir grupo)
│ ➤ ${PREFIX}del (Borrar msg)
╰─────────────────╯
> Vuelve con *${PREFIX}menu*
`;
    } 
    // ❌ CATEGORÍA NO ENCONTRADA
    else {
      return enviartexto(`❌ La categoría *${tipo}* no existe.\nUsa *${PREFIX}menu* para ver las opciones disponibles.`);
    }

    // Enviar el menú (Con un diseño más ligero para que se vea en WhatsApp normal)
    await sock.sendMessage(from, {
      image: { url: pfp }, // Usar URL evita problemas de lectura en WhatsApp normal
      caption: texto.trim(),
      mentions: [sender],
      contextInfo: {
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
