export default {
  command: ["daily", "diario", "dayli"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    
    // 👇 COMPROBACIÓN PREMIUM
    const isPremium = user.premium === true;
    
    const now = Date.now();
    // 👇 COOLDOWN REDUCIDO PARA PREMIUM (12h normal, 24h premium)
    const DAY = isPremium ? 43200000 : 86400000; 
    const timeSinceLast = now - (user.lastDaily || 0);

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
    
    // 👇 MENSAJE CON BONO PREMIUM
    const extraPremium = isPremium ? "\n> 💎 *Bono Premium: Cooldown reducido a 12h*" : "";

    await enviartexto(`「✿」*Recompensa Diaria*\n\n🔥 ¡Reclamado *¥${reward.toLocaleString()}*! (Día *${user.streak}*)\n> Día *${user.streak + 1}* » *+¥${next.toLocaleString()}*\n\n💰 Balance: *¥${user.coins.toLocaleString()}*${extraPremium}\n${config.footer}`);
  }
};