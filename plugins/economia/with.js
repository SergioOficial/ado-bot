export default {
  command: ["with", "retirar", "withdraw"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;

    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    user.bank = user.bank || 0;
    user.coins = user.coins || 0;

    const amountStr = args[0]?.toLowerCase();
    if (!amountStr) return enviartexto(`🏦 Uso: *${config.prefix[0]}with <cantidad|all>*`);

    let amount = amountStr === "all" || amountStr === "todo" ? user.bank : parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return enviartexto("⚠️ Ingresa una cantidad válida.");

    if (user.bank < amount) {
      return enviartexto(`❌ No tienes suficientes coins en el banco.\n> Tienes en banco: *¥${user.bank.toLocaleString()}*`);
    }

    user.bank -= amount;
    user.coins += amount;

    await enviartexto(`🏦 *RETIRO EXITOSO*\n\n> Retiraste: *¥${amount.toLocaleString()}*\n> En efectivo: *¥${user.coins.toLocaleString()}*\n> En el banco: *¥${user.bank.toLocaleString()}*`);
  }
};