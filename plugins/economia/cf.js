export default {
  command: ["cf", "coinflip", "caraocruz"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    user.coins = user.coins || 0;

    const option = args[0]?.toLowerCase(); // cara o cruz
    const bet = parseInt(args[1]);

    if (!["cara", "cruz", "heads", "tails"].includes(option) || isNaN(bet) || bet <= 0) {
      return enviartexto(`🪙 Uso: *${config.prefix[0]}cf <cara|cruz> <apuesta>*`);
    }

    if (user.coins < bet) return enviartexto(`❌ No tienes suficientes coins.`);

    const resultado = Math.random() < 0.5 ? "cara" : "cruz";
    const gano = (option === "heads" ? "cara" : option === "tails" ? "cruz" : option) === resultado;

    if (gano) {
      user.coins += bet;
      await enviartexto(`🪙 *¡GANASTE!*\n\n> Salió: *${resultado.toUpperCase()}*\n> Ganaste: *¥${bet.toLocaleString()}*\n> Balance: *¥${user.coins.toLocaleString()}*`);
    } else {
      user.coins -= bet;
      await enviartexto(`🪙 *¡PERDISTE!*\n\n> Salió: *${resultado.toUpperCase()}*\n> Perdiste: *¥${bet.toLocaleString()}*\n> Balance: *¥${user.coins.toLocaleString()}*`);
    }
  }
};