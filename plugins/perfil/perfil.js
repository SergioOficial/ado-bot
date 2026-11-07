export default {
  command: ["perfil", "profile", "me"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, db, config, BOT_NAME } = ctx;

    // Verificar si está registrado
    const user = db.users[sender];
    if (!user || !user.nombre) {
      return enviartexto(`❌ Aún no estás registrado.\nUsa: *${config.prefix}reg <nombre> <edad> <M/F>*`);
    }

    // Obtener foto de perfil (con fallback)
    let pfp;
    try { pfp = await sock.profilePictureUrl(sender, "image"); }
    catch { pfp = "https://i.postimg.cc/Y95RC8Jt/IMG-20261104-WA0014(1).jpg"; }

    // Cálculos de RPG
    const nivel = user.nivel || 1;
    const exp = user.exp || 0;
    const nivelMaxXP = nivel * 100;
    const progreso = Math.min(10, Math.floor((exp / nivelMaxXP) * 10));
    const barraXP = "▰".repeat(progreso) + "▱".repeat(10 - progreso);
    
    // Economía
    const coins = user.coins || 0;
    const oro = user.oro || 0;

    // 👑 Verificar Rango Premium
    const esPremium = user.premium === true;
    const rangoTexto = esPremium ? "💎 PREMIUM" : "👤 FREE";

    const textoPerfil = `
┏━━━〔 🐾 𝐏𝐄𝐑𝐅𝐈𝐋 〕━━━┓
┃ 👤 *Nombre:* ${user.nombre}
┃ 🎂 *Edad:* ${user.edad}
┃ ⚧ *Género:* ${user.genero}
┃ 📅 *Registro:* ${user.fecha}
┃ 📞 *Número:* +${user.numero}
┃ 🏅 *Rango:* ${rangoTexto}
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 ⚔️ 𝐄𝐒𝐓𝐀𝐃𝐈𝐒𝐓𝐈𝐂𝐀𝐒 〕━━━┓
┃ ✦ *Nivel:* ${nivel}
┃ ✦ *Exp:* ${exp}/${nivelMaxXP}
┃ ✦ *Progreso:* [${barraXP}]
┃ ✦ *Clase:* ${user.clase || "Novato"}
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 💰 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 〕━━━┓
┃ ➤ *Coins:* ¥${coins.toLocaleString()} 🪙
┃ ➤ *Oro:* ¥${oro.toLocaleString()} 💰
┗━━━━━━━━━━━━━━━━━━━━━┛
${config.footer}
`.trim();

    await sock.sendMessage(from, { 
      image: { url: pfp }, 
      caption: textoPerfil, 
      mentions: [sender] 
    }, { quoted: m });
  }
};
