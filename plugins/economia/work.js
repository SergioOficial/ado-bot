export default {
  command: ["work", "w"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const now = Date.now(), cooldown = 300000;
    if (now - (user.lastWork || 0) < cooldown) {
      const remain = cooldown - (now - user.lastWork);
      return enviartexto(`⏳ Vuelve en *${Math.floor(remain/60000)}m ${Math.floor((remain%60000)/1000)}s* 🔔`);
    }
    let mensaje;
    if (Math.random() < 0.7) {
      const reward = Math.floor(Math.random() * 35000) + 35000;
      user.coins = (user.coins || 0) + reward;
      mensaje = `✿ Trabajaste duro y ganaste *¥${reward.toLocaleString()} coins 💷*`;
    } else {
      const reward = Math.floor(Math.random() * 20000) + 5000;
      user.coins = Math.max(0, (user.coins || 0) - reward);
      mensaje = `💢 Perdiste *¥${reward.toLocaleString()} coins 💷*`;
    }
    user.lastWork = now;
    await enviartexto(`「✿」${mensaje}\n> 💰 Balance: *¥${(user.coins || 0).toLocaleString()}*\n${config.footer}`);
  }
};
