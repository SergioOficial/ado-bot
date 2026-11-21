import { enviarConBotones, rapido, lista } from "../../lib/botones.js";
import { LEYENDA, CREDITO, marcar } from "../../lib/menu-ayuda.js";
import { commands } from "../../pluginLoader.js";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const TOP = "╭╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭ࣧ⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭ࣧ⡹࣭ׄ࣪ ְ┈ํ͜─͜╼ꨪᰰ╾࣮╌╼ࣶׅ፝֟╾╮";
const MID = "├╾ׅ╴ׂ╌╶ׅ╌ׂ─ 〫─ׂ┄ׅ╴ׂ╌ׅ╶╼.. ╾ׅ╴ׂ╌╶ׅ╌ׂ";
const BOT = "╰╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭ࣧ⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭ࣧ⡹࣭ׄ ְ┈ํ͜─͜╼ꨪᰰ╾࣮╌╼ࣶׅ፝֟╾╯";

const compacta = (titulo, cmds) => `${TOP}
│❀ *${titulo}* ☆(ﾉ◕ヮ◕)ﾉ*
${MID}
│✿ ${cmds.join(" › ")}
${BOT}`;

const detallada = (titulo, items) => `${TOP}
│❀ *${titulo}* ☆(ﾉ◕ヮ◕)ﾉ*
${MID}
${items.map(([c, d]) => `│✿ ${c}\n> ✺ ${d}`).join("\n")}
${BOT}`;

export default {
  command: ["menu", "help", "menú", "ayuda"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX, db, args, comando, isGroup } = ctx;
    const numero = sender.split("@")[0];
    const tipo = args[0]?.toLowerCase();
    const p = PREFIX;

    // ═══════════ DATOS DEL BOT ═══════════
    let version = "1.1.3";
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));
      version = pkg.version || "1.1.3";
    } catch {}

    const uptime = process.uptime();
    const dias = Math.floor(uptime / 86400);
    const horas = Math.floor((uptime % 86400) / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    let tiempoStr = "";
    if (dias > 0) tiempoStr += `${dias}d `;
    if (horas > 0) tiempoStr += `${horas}h `;
    tiempoStr += `${mins}m`;

    const plataforma = `${os.type()} ${os.release()} ${os.arch()}`;
    const totalUsers = Object.keys(db.users || {}).length.toLocaleString('en-US');

    const miJid = sock.user?.id || "";
    const miNumero = miJid.split('@')[0].split(':')[0];
    const esPrincipal = (config.owners || []).some(o => (o.number || o) === miNumero);
    const botDb = db.users[`${miNumero}@s.whatsapp.net`] || {};
    const esPremium = botDb.premium === true;

    let tipoBot = "Owner";
    if (!esPrincipal) {
      tipoBot = esPremium ? "Prem-bot" : "Sub-Bot";
    }

    let urlLink = "https://github.com/SergioOficial/ado-bot";
    const meses = ["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sep.","oct.","nov.","dic."];
    const ahora = new Date();
    const fecha = `${ahora.getDate()} ${meses[ahora.getMonth()]} ${ahora.getFullYear()}, ${String(ahora.getHours()).padStart(2,"0")}:${String(ahora.getMinutes()).padStart(2,"0")} ${ahora.getHours() >= 12 ? "PM" : "AM"}`;

    const CANAL_JID = "120363425322183138@newsletter";
    const CANAL_NOMBRE = "⍪❖Ƭʜᴇ 𝑺𝒆𝒓𝒈𝒊𝒐—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const pfp = "https://i.postimg.cc/432DgtBQ/IMG-20261110-WA0107.jpg";

    // Cabecera fusionada con el bloque de info
    const header = (titulo) => `> *¡ʜᴏʟᴀ!* @${numero}, Como estas en esta navidad?, mucho gusto mi nombre es *ㅤ ⋰ּׅ ꯬ꫭ͙۪ૂ୲⡇꯭֟፝͠\` 🌃ㅤ̤ ̊𝙰𝚍𝚘𝑩𝒐𝒕 ㅤ   ּׅׄ  ꯬ꫭ͙۪ૂ୲⡇ 🎄ㅤ̉  ̹* (⁠ ⁠ꈍ⁠ᴗ⁠ꈍ⁠)*
 ⌒࣪᷼⏜͡ ۪ ࿚ꨪᰰ࿙ ࣭࣪⢏࣭۟⢢࣭ׄ᎐፝֟᎐࣭ׄ⡔࣭۟⡹࣭ׄ ࿚ꨪᰰ࿙ ۪ ͡⏜ׄ᷼⌒

: ̗̀│ꕥ *ᴛɪᴘᴏ ::* ${tipoBot}
│❀  *ᴅᴇsᴀʀʀᴏʟʟᴀᴅᴏʀ ::* Sergio Dev
│☄︎ *sɪsᴛᴇᴍᴀ/ᴏᴘʀ ::* ${plataforma}
│✧ *ᴠᴇʀsɪóɴ ::*  ${version}
│❖ *ᴜsᴇʀs ::* ${totalUsers}
│❖ *ᴍɪ ᴛɪᴇᴍᴘᴏ ::* ${fecha}
│❖ *ᴜʀʟ ::* ${urlLink}

 ⌒࣪᷼⏜͡ ۪ ࿚ꨪᰰ࿙ ࣭࣪⢏࣭۟⢢࣭ׄ᎐፝֟᎐࣭ׄ⡔࣭۟⡹࣭ׄ ࿚ꨪᰰ࿙ ۪ ͡⏜ׄ᷼⌒

⋆｡ﾟ🎄 ｡° *ᴄᴏᴍ꯭ᴀ꯭ɴ꯭ᴅ꯭ᴏ꯭s* ﾟ｡˚₊ 𓂃
`;

    let texto = "";

    // ═══════════ MENÚ PRINCIPAL ═══════════
    if (!tipo) {
      texto = header("Menú Principal") + `\n> 💡 *Tip:* Usa *${p}menu <categoría>* para ver los detalles.\n\n`;

      texto += compacta("🎁 Economía", ["work","daily","beg","bal","nivel","dep","with","pay","rob","crime","cf","slots","dice","rankcoins","interest","ppt","cofre","invertir","shop","give","weekly","monthly"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("⚔️ RPG", ["trabajar","cazar","pescar","minar","explorar","clase","ranknivel","talar","cultivar","repartir","pintar","hackear","streamer","policia","bombero","espiar","mago"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🐾 Mascotas", ["adoptar","animal","nombrar","acariciar","alimentar","pasear","animaltop","pelear","atacar","cambiar","huir","capturar","petactivo"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🎴 Gacha", ["gacha on","gacha off","rw","roll","rollwaifu","claim","c","reclamar","harem","waifus","claims","wtop","topwaifus","waifustop","charinfo","winfo","vote"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🌟 Perfil", ["reg","perfil","delperfil","level","lboard","afk"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🎄 Descargas", ["play","play2","fb","ig","tt","mf","apk","ytsearch","toimg"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("☃️ Stickers", ["s","brat","bratv","emojimix","stickers"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🧠 IA", ["ia","iaaudio","imagen", "iam"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🎉 Diversión", ["trivia","mate","8ball","meme","gato","perro","waifu","neko","ship","papel","memoria","cerito","tetris","ajedrez"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🔔 Utilidades", ["ping","info","creadores","traducir","clima","wiki","qr","tts","evento"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🐙 GitHub", ["gitsearch","ghsearch"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🤖 SubBots", ["code","jadibot","canjear","stopbot","bots"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🛡️ Admin", ["close","open","del","kick","promote","demote","warn","warns","delwarn","setwarnlimit","hidetag","antilink","bot","link","revoke","setgpname","setgpdesc","setgpbanner","pin","unpin","count","topcount","topinactive","gp","testwelcome"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("👑 Owner", ["fix","backup","restart","join","leave","gencode","error"].map(c => `${p}${c}`)) + "\n";
      texto += compacta("🧪 Test", [`${p}botones`]) + "\n";
      texto += compacta("🎭 Reacciones", ["angry","kill","sleep","hug","kiss","pat","slap","cry","dance","smile","wave","bonk","bite","blush","cuddle"].map(c => `${p}${c}`)) + "\n";

      texto += `\n${LEYENDA}\n\n${CREDITO}`;
    }
    // ═══════════ CATEGORÍAS ═══════════
    else if (tipo === 'economia' || tipo === 'economía' || tipo === 'economy' || tipo === 'economico') {
      texto = header("Economía") + "\n" + detallada("🎁 Economía", [
        [`${p}work › ${p}daily › ${p}beg`, "Ganar coins diarios"],
        [`${p}bal › ${p}nivel`, "Ver balance y nivel"],
        [`${p}dep › ${p}with`, "Depositar / retirar del banco"],
        [`${p}pay <@user> <monto>`, "Transferir coins a otro usuario"],
        [`${p}rob <@user> › ${p}crime`, "Robar o delinquir"],
        [`${p}cf › ${p}slots › ${p}dice`, "Juegos de azar"],
        [`${p}ppt`, "Piedra, papel o tijera"],
        [`${p}roulette › ${p}casino`, "Ruleta y casino"],
        [`${p}rankcoins › ${p}einfo`, "Top e info de economía"],
        [`${p}interest`, "Cobrar intereses del banco"],
        [`${p}cofre › ${p}invertir`, "Cofre (5k) e inversiones de riesgo"],
        [`${p}shop › ${p}give`, "Tienda y regalar coins"],
        [`${p}weekly › ${p}monthly`, "Recompensas semanal / mensual"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'github') {
      texto = header("GitHub") + "\n" + detallada("🐙 GitHub", [
        [`${p}gitsearch <txt>`, "Buscar repositorios en GitHub"],
        [`${p}githubsearch <txt>`, "Alias de gitsearch"],
        [`${p}ghsearch <txt>`, "Alias corto"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'rpg' || tipo === 'aventura' || tipo === 'aventure') {
      texto = header("RPG") + "\n" + detallada("⚔️ Aventura y RPG", [
        [`${p}trabajar`, "Trabajo básico del día"],
        [`${p}cazar › ${p}pescar › ${p}minar › ${p}explorar`, "Recolectar recursos"],
        [`${p}talar › ${p}cultivar › ${p}repartir › ${p}pintar`, "Oficios varios"],
        [`${p}hackear › ${p}streamer › ${p}policia › ${p}bombero › ${p}espiar › ${p}mago`, "Trabajos especiales"],
        [`${p}clase › ${p}ranknivel`, "Elegir clase y ranking"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'mascotas' || tipo === 'pets' || tipo === 'peleas') {
      texto = header("Mascotas") + "\n" + detallada("🐾 Mascotas y Peleas", [
        [`${p}adoptar <animal>`, "Adoptar una mascota"],
        [`${p}animal`, "Ver tus mascotas"],
        [`${p}nombrar <pet> <nombre>`, "Renombrar mascota"],
        [`${p}acariciar › ${p}alimentar › ${p}pasear`, "Cuidar mascota"],
        [`${p}animaltop`, "Ranking de mascotas"],
        [`${p}pelear`, "Buscar pelea salvaje"],
        [`${p}pelear <@user>`, "Duelo contra otro usuario"],
        [`${p}atacar <1-3>`, "Atacar (eligiendo movimiento)"],
        [`${p}cambiar › ${p}huir`, "Cambiar de mascota o huir"],
        [`${p}capturar`, "Capturar si está bajo el 40%"],
        [`${p}petactivo`, "Establecer mascota activa"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'gacha' || tipo === 'waifus' || tipo === 'claims') {
      texto = header("Gacha") + "\n" + detallada("🎴 Gacha", [
        [`${p}gacha on › ${p}gacha off`, "Activar / desactivar gacha"],
        [`${p}rw › ${p}roll › ${p}rollwaifu`, "Tirar personaje aleatorio"],
        [`${p}claim › ${p}c › ${p}reclamar`, "Reclamar personaje"],
        [`${p}harem › ${p}waifus › ${p}claims`, "Tu colección"],
        [`${p}wtop › ${p}topwaifus › ${p}waifustop`, "Top del grupo"],
        [`${p}charinfo › ${p}winfo`, "Ficha de personaje"],
        [`${p}vote <nombre>`, "Votar por un personaje (+valor)"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'perfil' || tipo === 'profile') {
      texto = header("Perfil") + "\n" + detallada("🌟 Perfil", [
        [`${p}reg <nom> <edad> <gen>`, "Registrarte"],
        [`${p}perfil`, "Ver tu perfil"],
        [`${p}delperfil`, "Borrar tu perfil"],
        [`${p}level › ${p}lboard`, "Nivel y ranking"],
        [`${p}afk [motivo]`, "Modo ausente"],
        [`${p}setdesc › ${p}setgenre › ${p}sethobby`, "Personalizar perfil"],
        [`${p}setbirth <DD/MM/AAAA>`, "Fecha de cumpleaños"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'descargas' || tipo === 'downloads') {
      texto = header("Descargas") + "\n" + detallada("🎄 Descargas", [
        [`${p}play › ${p}play2`, "Descargar música de YouTube"],
        [`${p}fb › ${p}ig › ${p}tt`, "Facebook, Instagram, TikTok"],
        [`${p}mf › ${p}apk`, "MediaFire y APKs"],
        [`${p}ytsearch › ${p}toimg`, "Buscar YouTube / sticker a imagen"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'stickers' || tipo === 's') {
      texto = header("Stickers") + "\n" + detallada("☃️ Stickers", [
        [`${p}s › ${p}sticker`, "Crear sticker desde imagen/video"],
        [`${p}brat <texto>`, "Sticker estilo brat"],
        [`${p}bratv <texto>`, "Video-sticker estilo brat"],
        [`${p}emojimix <emoji+emoji>`, "Mezclar 2 emojis"],
        [`${p}stickers <busq>`, "Buscar packs de stickers"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'ia') {
      texto = header("IA") + "\n" + detallada("🧠 Inteligencia Artificial", [
        [`${p}ia <pregunta>`, "Chatear con la IA"],
        [`${p}iaaudio <pregunta>`, "Respuesta en audio"],
        [`${p}imagen <prompt>`, "Generar imagen con IA"],
        [`${p}iam <prompt>`, "Generar música con IA (Suno)"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'fun' || tipo === 'juegos') {
      texto = header("Diversión") + "\n" + detallada("🎉 Diversión", [
        [`${p}trivia › ${p}mate › ${p}8ball`, "Trivia, matemáticas, 8ball"],
        [`${p}meme › ${p}gato › ${p}perro`, "Meme, gato, perro"],
        [`${p}waifu › ${p}neko › ${p}ship`, "Waifu, neko, ship"],
        [`${p}cerito › ${p}ajedrez › ${p}tetris`, "Juegos web en WhatsApp"],
        [`${p}papel › ${p}memoria`, "Juegos clásicos"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'utils' || tipo === 'utilidades') {
      texto = header("Utilidades") + "\n" + detallada("🔔 Utilidades", [
        [`${p}ping › ${p}info › ${p}creadores`, "Info básica del bot"],
        [`${p}traducir <txt> › ${p}clima <ciudad> › ${p}wiki <busq>`, "Traducción, clima, wiki"],
        [`${p}qr › ${p}tts <txt> › ${p}evento`, "Código QR, texto a voz, eventos"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'subbots' || tipo === 'bot' || tipo === 'stockens') {
      texto = header("Sub-Bots") + "\n" + detallada("🤖 Sub-Bots", [
        [`${p}code`, "Obtener código (gratis)"],
        [`${p}jadibot`, "Ser sub-bot (premium)"],
        [`${p}canjear <código>`, "Canjear código de sub-bot"],
        [`${p}stopbot › ${p}bots`, "Detener tu sub-bot / listar bots"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'owner' || tipo === 'dev') {
      texto = header("Owner") + "\n" + detallada("👑 Owner", [
        [`${p}fix › ${p}backup › ${p}restart`, "Mantenimiento del bot"],
        [`${p}join › ${p}leave › ${p}gencode`, "Unir/salir de grupos"],
        [`${p}error`, "Ver logs del bot"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'admin') {
      texto = header("Admin") + "\n" + detallada("🛡️ Admin", [
        [`${p}close › ${p}open`, "Cerrar / abrir el grupo"],
        [`${p}del › ${p}kick <@user> [motivo]`, "Eliminar mensaje / expulsar"],
        [`${p}promote › ${p}demote`, "Ascender / degradar admin"],
        [`${p}warn › ${p}warns › ${p}delwarn`, "Sistema de advertencias"],
        [`${p}setwarnlimit <1-10>`, "Límite de advertencias"],
        [`${p}hidetag <mensaje>`, "Mencionar a todos"],
        [`${p}antilink on|off › ${p}bot on|off`, "Antilink y bot on/off"],
        [`${p}link › ${p}revoke`, "Enlace y restablecer"],
        [`${p}setgpname › ${p}setgpdesc › ${p}setgpbanner`, "Configurar grupo"],
        [`${p}pin › ${p}unpin`, "Fijar / desfijar mensajes"],
        [`${p}count › ${p}topcount › ${p}topinactive`, "Estadísticas"],
        [`${p}gp › ${p}testwelcome`, "Info del grupo / test bienvenida"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'test') {
      texto = header("Test") + "\n" + detallada("🧪 Test", [
        [`${p}botones`, "Probar sistema de botones"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else if (tipo === 'reacciones' || tipo === 'reactions') {
      texto = header("Reacciones") + "\n" + detallada("🎭 Reacciones", [
        [`${p}angry › ${p}kill › ${p}sleep`, "Enojo, matar, dormir"],
        [`${p}hug › ${p}kiss › ${p}pat`, "Abrazo, beso, caricia"],
        [`${p}slap › ${p}cry › ${p}dance`, "Bofetada, llorar, bailar"],
        [`${p}smile › ${p}wave › ${p}bonk`, "Sonrisa, saludo, bonk"],
        [`${p}bite › ${p}blush › ${p}cuddle`, "Morder, sonrojarse, acurrucar"],
      ]) + `\n> Volver: *${p}menu*`;
    }
    else {
      return enviartexto(`❌ La categoría *${tipo}* no existe.\nUsa *${p}menu* para ver las opciones.`);
    }

    texto = marcar(texto, PREFIX, commands);

    try {
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
    } catch (err) {
      console.error("⚠️ No se pudo enviar el menú con imagen:", err?.stack || err);
      await enviartexto(texto.trim());
    }

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
                { id: `${comando} stickers`, title: "🖌️ Stickers", description: "sticker, brat, emojimix" },
                { id: `${comando} owner`, title: "👑 Owner", description: "solo dueños" },
                { id: `${comando} reacciones`, title: "🎭 Reacciones", description: "hug, kiss, pat, slap..." },
                { id: `${comando} fun`, title: "🎮 Juegos", description: "cerito, ajedrez, tetris" },
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