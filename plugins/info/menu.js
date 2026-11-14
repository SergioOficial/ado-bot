import { enviarConBotones, rapido, lista } from "../../lib/botones.js";
import { LEYENDA, CREDITO, marcar } from "../../lib/menu-ayuda.js";
import { commands } from "../../pluginLoader.js";

export default {
  command: ["menu", "help", "menú", "ayuda"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX, db, args, comando } = ctx;
    const numero = sender.split("@")[0];
    const tipo = args[0]?.toLowerCase();

    // 👤 Info del usuario
    const user = db.users[sender] || {};
    const totalUsers = Object.keys(db.users || {}).length;
    const esPremium = user.premium === true ? "💎 PREMIUM" : "👤 FREE";
    const nivelUser = user.nivel || 1;
    const rangoTexto = user.nombre ? `Nv. ${nivelUser} | ${esPremium}` : "No registrado";

    const CANAL_JID = "120363425322183138@newsletter";
    const CANAL_NOMBRE = "⍪❖Ƭʜᴇ 𝑺𝒆𝒓𝒈𝒊𝒐—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const CANAL_URL = "https://whatsapp.com/channel/0029Vb758GP6rsQkqWy5Xm2j";
    const pfp = "https://i.postimg.cc/432DgtBQ/IMG-20261110-WA0107.jpg";
    
    let texto = "";

    // 🌟 MENÚ PRINCIPAL
    if (!tipo) {
      texto = `
⋆｡°✩ 🐾 𝙰𝚍𝚘 - 𝐁𝐎𝐓 🐾 ✩°｡⋆
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
┃ ➤ ${PREFIX}work | ${PREFIX}daily | ${PREFIX}beg
┃ ➤ ${PREFIX}bal | ${PREFIX}nivel
┃ ➤ ${PREFIX}dep | ${PREFIX}with (Banco)
┃ ➤ ${PREFIX}pay <@user> <monto>
┃ ➤ ${PREFIX}rob <@user> | ${PREFIX}crime
┃ ➤ ${PREFIX}cf | ${PREFIX}slots | ${PREFIX}dice
┃ ➤ ${PREFIX}ppt | ${PREFIX}roulette | ${PREFIX}casino
┃ ➤ ${PREFIX}weekly | ${PREFIX}monthly
┃ ➤ ${PREFIX}coffer (no lo toca .rob)
┃ ➤ ${PREFIX}rankcoins | ${PREFIX}einfo
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🐾 *𝐌𝐀𝐒𝐂𝐎𝐓𝐀𝐒* 🐾
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}adoptar <animal>
┃ ➤ ${PREFIX}animal (Ver tus pets)
┃ ➤ ${PREFIX}nombrar <pet> <nombre>
┃ ➤ ${PREFIX}acariciar / alimentar / pasear
┃ ➤ ${PREFIX}animaltop
┃ ➤ ${PREFIX}pelear | ${PREFIX}pelear <@user>
┃ ➤ ${PREFIX}atacar | ${PREFIX}cambiar | ${PREFIX}huir
┃ ➤ ${PREFIX}capturar | ${PREFIX}petactivo
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🎴 *𝐆𝐀𝐂𝐇𝐀* 🎴
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}gacha on | off
┃ ➤ ${PREFIX}rw | ${PREFIX}roll | ${PREFIX}rollwaifu
┃ ➤ ${PREFIX}claim | ${PREFIX}c | ${PREFIX}reclamar
┃ ➤ ${PREFIX}harem | ${PREFIX}waifus | ${PREFIX}claims
┃ ➤ ${PREFIX}wtop | ${PREFIX}topwaifus | ${PREFIX}waifustop
┃ ➤ ${PREFIX}charinfo | ${PREFIX}winfo
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ ⚔️ *𝐑𝐏𝐆* ⚔️
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}trabajar | ${PREFIX}cazar | ${PREFIX}pescar
┃ ➤ ${PREFIX}minar | ${PREFIX}explorar
┃ ➤ ${PREFIX}clase | ${PREFIX}ranknivel
┃ ➤ ${PREFIX}talar | ${PREFIX}cultivar
┃ ➤ ${PREFIX}repartir | ${PREFIX}pintar
┃ ➤ ${PREFIX}hackear | ${PREFIX}streamer
┃ ➤ ${PREFIX}policia | ${PREFIX}bombero
┃ ➤ ${PREFIX}espiar | ${PREFIX}mago
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
┃ ➤ ${PREFIX}play | ${PREFIX}play2
┃ ➤ ${PREFIX}fb | ${PREFIX}ig | ${PREFIX}tt
┃ ➤ ${PREFIX}mf | ${PREFIX}apk
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
┃ 🔒 » ${PREFIX}close | ${PREFIX}open
┃ 🗑️ » ${PREFIX}del
┃ 👢 » ${PREFIX}kick <@user> [motivo]
┃ 👑 » ${PREFIX}promote | ${PREFIX}demote
┃ ⚖️ » ${PREFIX}warn | ${PREFIX}warns | ${PREFIX}delwarn
┃ 📏 » ${PREFIX}setwarnlimit <1-10>
┃ 📢 » ${PREFIX}hidetag <mensaje>
┃ 🔗 » ${PREFIX}antilink on|off
┃ 🤖 » ${PREFIX}bot on|off
┃ 🔗 » ${PREFIX}link | ${PREFIX}revoke
┃ ✏️ » ${PREFIX}setgpname | ${PREFIX}setgpdesc
┃ 🖼️ » ${PREFIX}setgpbanner (citando foto)
┃ 📌 » ${PREFIX}pin | ${PREFIX}unpin
┃ 📊 » ${PREFIX}count | ${PREFIX}topcount | ${PREFIX}topinactive
┃ 📋 » ${PREFIX}gp
┃ ➤ ${PREFIX}testwelcome (Probar bienvenida)
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🐙 *GITHUB* 🐙
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}gitsearch <txt>
┃ ➤ ${PREFIX}ghsearch <txt> (alias)
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
┃ ➤ ${PREFIX}error (Ver logs del bot)
┃ ➤ ${PREFIX}error clear (Borrar logs)
┗━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━┓
┃ 🧪 *𝐓𝐄𝐒𝐓* 🧪
┣━━━━━━━━━━━━━━━━━━┛
┃ ➤ ${PREFIX}botones
┗━━━━━━━━━━━━━━━━━━┛

> 💡 *Tip:* También puedes usar *${PREFIX}menu <tipo>* (ej: *${PREFIX}menu rpg*) para ver las categorías de forma más limpia.
`;
    }
    // 🎁 ECONOMÍA
    else if (tipo === 'economia') {
      texto = `
⋆｡°✩ 🎁 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ ➤ ${PREFIX}work | ${PREFIX}daily | ${PREFIX}beg
┃ ➤ ${PREFIX}bal | ${PREFIX}nivel
┃ ➤ ${PREFIX}dep | ${PREFIX}with (Banco)
┃ ➤ ${PREFIX}pay <@user> <monto>
┃ ➤ ${PREFIX}rob <@user> | ${PREFIX}crime
┃ ➤ ${PREFIX}cf | ${PREFIX}slots | ${PREFIX}dice
┃ ➤ ${PREFIX}rankcoins
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🐙 GITHUB
    else if (tipo === 'github') {
      texto = `
⋆｡°✩ 🐙 *GITHUB* 🐙 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ ➤ ${PREFIX}gitsearch <txt>
┃ ➤ ${PREFIX}githubsearch <txt>
┃ ➤ ${PREFIX}ghsearch <txt>
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // ⚔️ RPG
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
┃ 🪓 » ${PREFIX}talar 
┃ 🍠 » ${PREFIX}cultivar
┃ 🚚 » ${PREFIX}repartir 
┃ 🖌️ » ${PREFIX}pintar
┃ 💻 » ${PREFIX}hackear 
┃ 📷 » ${PREFIX}streamer
┃ 🚔 » ${PREFIX}policia 
┃ 💧 » ${PREFIX}bombero
┃ 🫩 » ${PREFIX}espiar 
┃ 🪄 » ${PREFIX}mago
┃ 🐶 » ${PREFIX}adoptar <animal>
┃ 🦍 » ${PREFIX}animal (Ver tus pets)
┃ 🏷️ » ${PREFIX}nombrar <pet> <nombre>
┃ 🫱» ${PREFIX}acariciar / alimentar / pasear
┃ 🔝 » ${PREFIX}animaltop
┃ ⚔️ » ${PREFIX}pelear (salvaje)
┃ 🥊 » ${PREFIX}pelear <@user> (duelo)
┃ 💢 » ${PREFIX}atacar <1-3>
┃ 🔄 » ${PREFIX}cambiar (saca a otra)
┃ 🏃 » ${PREFIX}huir
┃ 🔮 » ${PREFIX}capturar | ${PREFIX}petactivo
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🐾 MASCOTAS Y PELEAS
    else if (tipo === 'mascotas' || tipo === 'pets' || tipo === 'peleas') {
      texto = `
⋆｡°✩ 🐾 *𝐌𝐀𝐒𝐂𝐎𝐓𝐀𝐒 𝐘 𝐏𝐄𝐋𝐄𝐀𝐒* 🐾 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🐶 » ${PREFIX}adoptar <animal>
┃ 🦍 » ${PREFIX}animal (Ver tus pets)
┃ 🏷️ » ${PREFIX}nombrar <pet> <nombre>
┃ 🫱 » ${PREFIX}acariciar | ${PREFIX}alimentar | ${PREFIX}pasear
┃ 🔝 » ${PREFIX}animaltop
┣━━━━━━━━━━━━━━━━━━┛
┃ ⚔️ *Peleas con botones*
┃ 🥊 » ${PREFIX}pelear (busca una salvaje)
┃ 🤝 » ${PREFIX}pelear <@user> (duelo)
┃ 💢 » ${PREFIX}atacar <1-3> (o el botón)
┃ 🔄 » ${PREFIX}cambiar (saca a otra, gasta turno)
┃ 🔮 » ${PREFIX}capturar (si está por debajo del 40 %)
┃ 🏃 » ${PREFIX}huir
┃ ⭐ » ${PREFIX}petactivo <pet> (cuál sale primero)
┗━━━━━━━━━━━━━━━━━━┛
> Cada ataque tiene su tipo: fuego, agua, planta, tierra, aire, luz, sombra y normal.
> Volver: *${PREFIX}menu*
`;
    }
    // 🎴 GACHA
    else if (tipo === 'gacha' || tipo === 'waifus' || tipo === 'claims') {
      texto = `
⋆｡°✩ 🎴 *𝐆𝐀𝐂𝐇𝐀* 🎴 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🎲 *Tirar*
┃ ➤ ${PREFIX}rw | ${PREFIX}roll | ${PREFIX}rollwaifu
┃ 🏷️ *Reclamar*
┃ ➤ ${PREFIX}claim | ${PREFIX}c | ${PREFIX}reclamar
┃ 📚 *Tu colección*
┃ ➤ ${PREFIX}harem | ${PREFIX}waifus | ${PREFIX}claims
┃ 🏆 *Ranking del grupo*
┃ ➤ ${PREFIX}wtop | ${PREFIX}topwaifus | ${PREFIX}waifustop
┃ 🔎 *Ficha*
┃ ➤ ${PREFIX}charinfo | ${PREFIX}winfo
┃ ⚙️ *Encender o apagar*
┃ ➤ ${PREFIX}gacha on | ${PREFIX}gacha off
┗━━━━━━━━━━━━━━━━━━┛
> Se tira cada 15 minutos, se reclama cada 30 y solo en grupos.
> Volver: *${PREFIX}menu*
`;
    }
    // 🌟 PERFIL
    else if (tipo === 'perfil') {
      texto = `
⋆｡°✩ 🌟 𝐏𝐄𝐑𝐅𝐈𝐋 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🧍 » ${PREFIX}reg <nom> <edad> <gen>
┃ 👤 » ${PREFIX}perfil | ${PREFIX}level
┃ 🏅 » ${PREFIX}lboard
┃ ✏️ » ${PREFIX}setdesc | ${PREFIX}setgenre | ${PREFIX}sethobby
┃ 🎂 » ${PREFIX}setbirth <DD/MM/AAAA>
┃ 🗑️ » ${PREFIX}deldesc | ${PREFIX}delbirth
┃ 💤 » ${PREFIX}afk [motivo]
┃ 🗑️ » ${PREFIX}delperfil
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🎄 DESCARGAS
    else if (tipo === 'descargas') {
      texto = `
⋆｡°✩ 🎄 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ ➤ ${PREFIX}play | ${PREFIX}play2
┃ ➤ ${PREFIX}fb | ${PREFIX}ig | ${PREFIX}tt
┃ ➤ ${PREFIX}mf | ${PREFIX}apk
┃ ➤ ${PREFIX}ytsearch | ${PREFIX}toimg
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // ☃️ STICKERS
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
    // 🧠 IA
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
    // 🎉 FUN
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
    // 🔔 UTILS
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
┃ 📱 » ${PREFIX}qr | ${PREFIX}morse
┃ 🗳️ » ${PREFIX}encuesta | ${PREFIX}say
┃ 👁️ » ${PREFIX}read | ${PREFIX}pfp | ${PREFIX}wastalk
┃ ⏰ » ${PREFIX}recordar <min>|<texto>
┃ 📊 » ${PREFIX}allmenu | ${PREFIX}menucat
┃ 🩺 » ${PREFIX}health | ${PREFIX}runtime | ${PREFIX}status
┃ 🛡️ » ${PREFIX}warmup | ${PREFIX}antiban
┃ 🤖 » ${PREFIX}botinfo | ${PREFIX}newsletter
┃ 🚫 » ${PREFIX}blocklist | ${PREFIX}block | ${PREFIX}unblock
┃ 📄 » ${PREFIX}getplugin | ${PREFIX}nuevo | ${PREFIX}delplugin
┃ 🪪 » ${PREFIX}lid | ${PREFIX}cache | ${PREFIX}infobot
┃ 💹 » ${PREFIX}crypto <btc> | ${PREFIX}letra <art> <tema>
┃ 🔗 » ${PREFIX}acortar <url> | ${PREFIX}tourl
┃ 🎤 » ${PREFIX}tts <txt>
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🤖 SUBBOTS
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
    // 👑 OWNER
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
┃ 🩺 » ${PREFIX}compat (diagnóstico, solo privado)
┃ 📤 » ${PREFIX}subir <ruta> | <contenido>
┃ 🧠 » ${PREFIX}eval <código>
┃ 🛡️ » ${PREFIX}warmup | ${PREFIX}antiban
┃ 📄 » ${PREFIX}getplugin | ${PREFIX}botinfo
┃ 🚫 » ${PREFIX}block | ${PREFIX}unblock
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🛡️ ADMIN
    else if (tipo === 'admin') {
      texto = `
⋆｡°✩ 🛡️ 𝐀𝐃𝐌𝐈𝐍 ✩°｡⋆
┏━━━━━━━━━━━━━━━━━━┓
┃ 🔒 » ${PREFIX}close | ${PREFIX}open
┃ 🗑️ » ${PREFIX}del
┃ 👢 » ${PREFIX}kick <@user> [motivo]
┃ 👑 » ${PREFIX}promote | ${PREFIX}demote
┃ ⚖️ » ${PREFIX}warn | ${PREFIX}warns | ${PREFIX}delwarn
┃ 📏 » ${PREFIX}setwarnlimit <1-10>
┃ 📢 » ${PREFIX}hidetag <mensaje>
┃ 🔗 » ${PREFIX}antilink on|off
┃ 🤖 » ${PREFIX}bot on|off
┃ 🔗 » ${PREFIX}link | ${PREFIX}revoke
┃ ✏️ » ${PREFIX}setgpname | ${PREFIX}setgpdesc
┃ 🖼️ » ${PREFIX}setgpbanner (citando foto)
┃ 📌 » ${PREFIX}pin | ${PREFIX}unpin
┃ 📊 » ${PREFIX}count | ${PREFIX}topcount | ${PREFIX}topinactive
┃ 📋 » ${PREFIX}gp
┃ ➤ ${PREFIX}testwelcome (Probar bienvenida)
┗━━━━━━━━━━━━━━━━━━┛
> Volver: *${PREFIX}menu*
`;
    }
    // 🧪 TEST
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

    // Guía rápida (la de Shin-MD, tal cual) y crédito de su autor. Solo en el
    // menú principal: en una categoría ya estorbaba.
    if (!tipo) {
      texto += `\n\n${LEYENDA}\n\n${CREDITO}`;
    }

    // Marcas Ⓓ/Ⓐ/Ⓟ leídas de los plugins cargados: sin bandera, sin marca.
    texto = marcar(texto, PREFIX, commands);

    // ✅ AQUÍ ESTÁ LA MAGIA DEL "VER CANAL" (Bien estructurado)
    await sock.sendMessage(from, {
      image: { url: pfp },
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

    // Botones de categorías: solo en el menú principal y solo si el plugin se
    // pidió con `menu` a secas. El id de cada botón es el comando completo
    // (`menu economia`), que el router ya sabe ejecutar.
    // Los tres botones del menú de Shin-MD: la lista de categorías, el atajo a
    // `.menucat` y `.allmenu`. Son tres a propósito: WhatsApp solo dibuja tres;
    // el cuarto se pierde sin avisar (para más, `paramsHoja`).
    if (!tipo) {
      await enviarConBotones(sock, from, {
        texto: "📂 *Selecciona una categoría*\n> O escribe el comando completo.",
        pie: config.footer,
        botones: [
          lista("🗂️ Explorar categorías", [
            {
              title: "Comandos",
              rows: [
                { id: `${comando} economia`, title: "💰 Economía", description: "daily, work, bal, banco, apuestas" },
                { id: `${comando} rpg`, title: "⚔️ RPG", description: "cazar, pescar, minar, explorar" },
                { id: `${comando} mascotas`, title: "🐾 Mascotas", description: "adoptar, pelear, atacar, cambiar" },
                { id: `${comando} gacha`, title: "🎴 Gacha", description: "rw, claim, harem, wtop" },
                { id: `${comando} perfil`, title: "🧾 Perfil", description: "reg, level, afk, ficha" },
                { id: `${comando} descargas`, title: "📥 Descargas", description: "play, tt, fb, pinterest" },
                { id: `${comando} admin`, title: "🛡️ Admin", description: "kick, promote, warn, antilink" },
              ],
            },
            {
              title: "Más",
              rows: [
                { id: `${comando} utils`, title: "🔔 Utilidades", description: "qr, morse, encuesta, recordar" },
                { id: `${comando} ia`, title: "🧠 IA", description: "ia, iaaudio, imagen" },
                { id: `${comando} stickers`, title: "🖌️ Stickers", description: "sticker, brat" },
                { id: `${comando} owner`, title: "👑 Owner", description: "solo dueños" },
              ],
            },
          ]),
          rapido("🗂️ Categorías", "menucatstyle"),
          rapido("☰ Ver todo", "allmenu"),
        ],
      }).catch(() => {});
    }
  }
};
