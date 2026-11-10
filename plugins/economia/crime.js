export default {
  command: ["crime", "crimen"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cooldown = 30 * 60 * 1000; // 30 minutos

    if (now - (user.lastCrime || 0) < cooldown) {
      const remain = cooldown - (now - user.lastCrime);
      return enviartexto(`⏳ Estás escondido de la policía. Vuelve en *${Math.floor(remain / 60000)}m*`);
    }

    user.lastCrime = now;
    const suerte = Math.random();

    if (suerte < 0.5) {
      const reward = Math.floor(Math.random() * 5000) + 2000;
      user.coins = (user.coins || 0) + reward;
      await enviartexto(`💼 *¡CRIMEN PERFECTO!*\n\nHackeaste un banco y ganaste *¥${reward.toLocaleString()}* coins.`);
    } else {
      const loss = Math.floor(Math.random() * 3000) + 1000;
      user.coins = Math.max(0, (user.coins || 0) - loss);
      await enviartexto(`👮‍♂️ *¡TE ATRAPARON!*\n\nFuiste a la cárcel y perdiste *¥${loss.toLocaleString()}* coins en sobornos.`);
    }
  }
};