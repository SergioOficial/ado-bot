export default {
  command: ["coins", "balance", "bal"],
  execute: async (ctx) => {
    const { sock, from, m, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const coins = user.coins || user.oro || 0;
    await sock.sendMessage(from, { text: `╭───「 *💰 Balance* 」\n│ 💳 @${sender.split("@")[0]}\n│ 🏅 Nivel: ${user.nivel || 1}\n│ 📈 Exp: ${(user.exp || 0).toLocaleString()}\n│ 💎 Riqueza: ¥${coins.toLocaleString()}\n╰───────────────────────\n${config.footer}`, mentions: [sender] }, { quoted: m });
  }
};
