export default {
  command: ["menuprem", "vipmenu"],
  execute: async (ctx) => {
    const { sock, from, m, sender, enviartexto, db, config } = ctx;
    const user = db.users[sender];
    const isPremium = user?.premium === true || (user?.premiumExpiresAt && user.premiumExpiresAt > Date.now());

    if (!isPremium) return enviartexto(`💎 Este menú es solo para *Premium*.\nUsa *${config.prefix[0]}prem* para comprar.`);

    const pfp = "https://i.postimg.cc/tCxLWwN2/1795823999862.jpg";

    const texto = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
    💎 𝐌𝐄𝐍𝐔 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 💎
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✨ *¡Hola,* @${sender.split('@')[0]}! ✨
Disfruta de tus beneficios exclusivos.

╭─「 🧠 𝐈𝐀 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 」─╮
│ ➤ ${config.prefix}ia (Respuestas avanzadas)
│ ➤ ${config.prefix}iaaudio (Voz mejorada)
╰──────────────────────╯

╭─「 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐆 𝐏𝐄𝐑𝐅𝐈𝐋 」─╮
│ ➤ ${config.prefix}setdesc <texto>
│ ➤ ${config.prefix}setfecha <fecha>
│ ➤ ${config.prefix}perfil (Tarjeta mejorada)
╰──────────────────────╯

╭─「 🧪 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 𝐁𝐄𝐓𝐀 」─╮
│ ➤ ${config.prefix}rol (Roles avanzados)
│ ➤ ${config.prefix}prem (Gestionar VIP)
│ ➤ (Pronto más comandos...)
╰──────────────────────╯

╭─「 🚀 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 𝐕𝐈𝐏 」─╮
│ 💵 ${config.prefix}work (Cooldown x2 más rápido)
│ 🎁 ${config.prefix}daily (Cooldown x2 más rápido)
╰──────────────────────╯

${config.footer}
    `.trim();

    await sock.sendMessage(from, { image: { url: pfp }, caption: texto, mentions: [sender] }, { quoted: m });
  }
};