export default {
  command: ["perfil", "profile", "me"],
  execute: async (ctx) => {
    const { sock, sender, from, m, args, enviartexto, db, config, BOT_NAME, getTargetFromMsg } = ctx;

    // 1. Determinar de quién es el perfil (mención/respuesta o el propio usuario)
    const { jid: mentionedJid } = getTargetFromMsg(m, args);
    const targetJid = mentionedJid || sender;
    const isSelf = targetJid === sender;

    // 2. Verificar si el usuario objetivo está registrado
    const user = db.users[targetJid];
    if (!user || !user.nombre) {
      return enviartexto(`❌ ${isSelf ? "Aún no estás registrado" : "El usuario mencionado no está registrado"}.\nUsa: *${config.prefix[0]}reg <nombre> <edad> <M/F>*`);
    }

    // 3. Obtener foto de perfil (con fallback)
    let pfp;
    try { pfp = await sock.profilePictureUrl(targetJid, "image"); }
    catch { pfp = "https://i.postimg.cc/Y95RC8Jt/IMG-20261104-WA0014(1).jpg"; }

    // 4. Cálculos de RPG
    // riokuroxi-svg: proteger la barra frente a datos antiguos o corruptos.
    const nivel = Number.isFinite(Number(user.nivel)) ? Math.max(1, Number(user.nivel)) : 1;
    const exp = Number.isFinite(Number(user.exp)) ? Math.max(0, Number(user.exp)) : 0;
    const nivelMaxXP = nivel * 100;
    const progreso = Math.max(0, Math.min(10, Math.floor((exp / nivelMaxXP) * 10)));
    const barraXP = "▰".repeat(progreso) + "▱".repeat(10 - progreso);

    // 5. Economía
    const coins = user.coins || 0;
    const oro = user.oro || 0;

    // 6. 👑 Verificar Rango Premium (Eterno o Temporal)
    const esPremium = user.premium === true || (user.premiumExpiresAt && user.premiumExpiresAt > Date.now());
    const rangoTexto = esPremium ? "💎 PREMIUM" : "👤 FREE";

    // 7. 💤 Verificar si está AFK
    let afkSection = "";
    if (user.afk) {
      const tiempoAFK = user.afkTimestamp ? Math.floor((Date.now() - user.afkTimestamp) / 60000) : 0;
      afkSection = `
┏━━━〔 💤 𝐄𝐒𝐓𝐀𝐃𝐎 𝐀𝐅𝐊 〕━━━┓
┃ 💤 *Estado:* Ausente
┃ 📝 *Razón:* ${user.afkReason || "Sin razón especificada"}
┃ ⏱️ *Hace:* ${tiempoAFK} minutos
┗━━━━━━━━━━━━━━━━┛`;
    }

    // 8. 🎨 Verificar Personalización Premium (Solo si es premium)
    let premiumSection = "";
    if (esPremium && (user.desc || user.customFecha)) {
      premiumSection = `${user.desc ? `┃ *Descripción:* ${user.desc}\n` : ""}`;
    }

    // 9. Construir el texto final
    const textoPerfil = `
「✿」 *Perfil* ◢ *${user.nombre}* ◤

${premiumSection}

ⴵ Edad › ${user.edad}
✐ Registro › ${user.fecha}
⚥ Género › ${user.genero}
♡ Casadx con › ${user.marry ? `@${user.marry.split("@")[0]}\n` : ""}
❀ Plan › ${rangoTexto}
```#``` Número › +${user.numero}

✿ Nivel › ${nivel}
❀ Experiencia › ${exp}/${nivelMaxXP}
➨ Progreso › [${barraXP}]
⸙ Clase › ${user.clase || "Novato"}

♛ Cumpleaños › ${user.customFecha ? ` *Fecha Especial:* ${user.customFecha}\n`  : ""}

${afkSection}

⛁ Coins totales › ${coins.toLocaleString()} *Yenes*
❒ Oros › ${oro.toLocaleString()} 
${config.footer}
`.trim();

    // 10. Enviar el mensaje con las menciones correctas
    const mentions = [targetJid];
    if (user.marry) mentions.push(user.marry);

    await sock.sendMessage(from, { 
      image: { url: pfp }, 
      caption: textoPerfil, 
      mentions 
    }, { quoted: m });
  }
};