export default {
  command: ["interest", "interes"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = { bank: 0, lastInterest: 0 };
    const user = db.users[sender];
    
    const isPremium = user.premium === true || (user.premiumExpiresAt && user.premiumExpiresAt > Date.now());
    const now = Date.now();
    const DAY = isPremium ? 43200000 : 86400000; // 12h Premium / 24h Normal

    if (now - (user.lastInterest || 0) < DAY) {
      const remain = DAY - (now - user.lastInterest);
      return enviartexto(`⏳ Vuelve en *${Math.floor(remain/3600000)}h ${Math.floor((remain%3600000)/60000)}m* para cobrar intereses.`);
    }

    if ((user.bank || 0) < 1000) {
      return enviartexto("❌ Necesitas al menos *¥1,000* en el banco para generar intereses.");
    }

    // 5% de interés (o 7% si es premium)
    const rate = isPremium ? 0.07 : 0.05;
    const ganancia = Math.floor(user.bank * rate);
    
    user.coins = (user.coins || 0) + ganancia;
    user.lastInterest = now;

    await enviartexto(
      `🏦 *INTERESES BANCARIOS*\n\n` +
      `💵 *Interés generado:* ¥${ganancia.toLocaleString()} (${rate * 100}%)\n` +
      `💰 *Balance actual:* ¥${user.coins.toLocaleString()}\n` +
      `> ${isPremium ? "💎 *Bono Premium aplicado*" : ""}\n${config.footer}`
    );
  }
};