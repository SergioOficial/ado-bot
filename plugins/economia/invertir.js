export default {
  command: ["invertir", "invest"],
  execute: async (ctx) => {
    const { enviartexto, sender, args, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = { coins: 0 };
    const user = db.users[sender];

    const monto = parseInt(args[0]);
    if (isNaN(monto) || monto < 1000) return enviartexto(`📈 Uso: ${config.prefix[0]}invertir <monto>\nEl mínimo es ¥1,000.`);
    if ((user.coins || 0) < monto) return enviartexto("❌ No tienes suficientes coins.");

    user.coins -= monto;
    const suerte = Math.random();

    if (suerte < 0.4) { // 40% de ganar
      const ganancia = Math.floor(monto * 1.8); // x1.8
      user.coins += ganancia;
      await enviartexto(`📈 *INVERSIÓN EXITOSA*\n\nInvertiste ¥${monto.toLocaleString()} y el mercado subió.\n> Ganancia: *+¥${(ganancia - monto).toLocaleString()}*\n💰 Balance: *¥${user.coins.toLocaleString()}*`);
    } else {
      await enviartexto(`📉 *INVERSIÓN FALLIDA*\n\nInvertiste ¥${monto.toLocaleString()} pero el mercado colapsó.\n> Pérdida: *-¥${monto.toLocaleString()}*\n💰 Balance: *¥${user.coins.toLocaleString()}*`);
    }
  }
};