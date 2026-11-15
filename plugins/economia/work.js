export default {
  command: ["work", "w"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    
    // 👇 COMPROBACIÓN PREMIUM
    const isPremium = user.premium === true;
    
    const now = Date.now();
    // 👇 COOLDOWN REDUCIDO PARA PREMIUM (2.5 min normal, 5 min premium)
    const cooldown = isPremium ? 150000 : 300000;

    if (now - (user.lastWork || 0) < cooldown) {
      const remain = cooldown - (now - user.lastWork);
      const min = Math.floor(remain / 60000);
      const seg = Math.floor((remain % 60000) / 1000);
      return enviartexto(`⏳ Vuelve en *${min}m ${seg}s* 🔔`);
    }

    const suerte = Math.random();
    let reward, mensaje;

    if (suerte < 0.7) {
      reward = Math.floor(Math.random() * 35000) + 35000;
      user.coins = (user.coins || 0) + reward;
      mensaje = `✿ Trabajaste duro y ganaste *¥${reward.toLocaleString()} coins 💷*`;
    } else {
      reward = Math.floor(Math.random() * 20000) + 5000;
      user.coins = Math.max(0, (user.coins || 0) - reward);
      mensaje = `💢 Perdiste *¥${reward.toLocaleString()} coins 💷*`;
    }

    user.lastWork = now;
    
    // Un pequeño extra visual si es premium
    const extraPremium = isPremium ? "\n> 💎 *Bono Premium aplicado*" : "";

    await enviartexto(`「✿」${mensaje}\n> 💰 Balance: *¥${(user.coins || 0).toLocaleString()}*${extraPremium}\n${config.footer}`);
  }
};