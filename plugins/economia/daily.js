export default {
  command: ["daily", "diario"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const now = Date.now(), DAY = 86400000, timeSinceLast = now - (user.lastDaily || 0);
    if (timeSinceLast < DAY) {
      const remain = DAY - timeSinceLast;
      return enviartexto(`《✧》Ya reclamaste hoy. Vuelve en *${Math.floor(remain/3600000)}h ${Math.floor((remain%3600000)/60000)}m ${Math.floor((remain%60000)/1000)}s* ⏳`);
    }
    const missed = timeSinceLast > DAY * 2;
    user.streak = missed ? 1 : (user.streak || 0) + 1;
    const reward = Math.floor(30000 * (1 + 0.15 * (user.streak - 1)));
    user.coins = (user.coins || 0) + reward;
    user.lastDaily = now;
    const next = Math.floor(30000 * (1 + 0.15 * user.streak));
    await enviartexto(`「✿」*Recompensa Diaria*\n\n🔥 ¡Reclamado *¥${reward.toLocaleString()}*! (Día *${user.streak}*)\n> Día *${user.streak + 1}* » *+¥${next.toLocaleString()}*\n\n💰 Balance: *¥${user.coins.toLocaleString()}*\n${config.footer}`);
  }
};
