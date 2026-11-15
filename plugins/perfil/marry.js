export default {
  command: ["marry", "casarse", "matrimonio"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, getTargetFromMsg, config } = ctx;
    const user = db.users[sender];
    const isPremium = user?.premium === true || (user?.premiumExpiresAt && user.premiumExpiresAt > Date.now());
    
    const { jid: targetJid } = getTargetFromMsg(m, args);
    if (!targetJid) return enviartexto(`💍 Menciona a quién quieres casarte.`);
    
    if (!db.users[targetJid]) db.users[targetJid] = {};
    const target = db.users[targetJid];
    
    if (user.marry) return enviartexto("❌ Ya estás casado/a.");
    if (target.marry) return enviartexto("❌ Esa persona ya está casada.");

    user.marry = targetJid;
    target.marry = sender;

    const deco = isPremium 
      ? `💎 *¡BODA PREMIUM!* 💎\n\n✨ @${sender.split('@')[0]} y @${targetJid.split('@')[0]} se han unido en sagrado matrimonio con un lujoso banquete.`
      : `💍 *¡BODA!* 💍\n\n❤️ @${sender.split('@')[0]} y @${targetJid.split('@')[0]} ahora están casados.`;

    await sock.sendMessage(from, { text: deco, mentions: [sender, targetJid] }, { quoted: m });
  }
};