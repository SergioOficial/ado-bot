export default {
  command: ["dep", "depositar", "deposit", "d"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;

    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    user.bank = user.bank || 0;
    user.coins = user.coins || 0;

    const amountStr = args[0]?.toLowerCase();
    if (!amountStr) return enviartexto(`🏦 Uso: *${config.prefix[0]}dep <cantidad|all>*`);

    let amount = amountStr === "all" || amountStr === "todo" ? user.coins : parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return enviartexto("⚠️ Ingresa una cantidad válida.");

    if (user.coins < amount) {
      return enviartexto(`❌ No tienes suficientes coins en efectivo.\n> Tienes: *¥${user.coins.toLocaleString()}*`);
    }

    user.coins -= amount;
    user.bank += amount;

    await enviartexto(`🏦 *DEPÓSITO EXITOSO*\n\n> Depósitaste: *¥${amount.toLocaleString()}*\n> En el banco: *¥${user.bank.toLocaleString()}*\n> En efectivo: *¥${user.coins.toLocaleString()}*`);
  }
};