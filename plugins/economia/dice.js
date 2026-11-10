export default {
  command: ["dice", "dados"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    user.coins = user.coins || 0;

    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) return enviartexto(`🎲 Uso: *${config.prefix[0]}dice <apuesta>*`);
    if (user.coins < bet) return enviartexto(`❌ No tienes suficientes coins.`);

    const userDice = Math.floor(Math.random() * 6) + 1;
    const botDice = Math.floor(Math.random() * 6) + 1;

    let resultado = "";
    if (userDice > botDice) {
      user.coins += bet;
      resultado = `🎉 ¡Ganaste *¥${bet.toLocaleString()}*!`;
    } else if (userDice < botDice) {
      user.coins -= bet;
      resultado = `💀 Perdiste *¥${bet.toLocaleString()}*.`;
    } else {
      resultado = `🤝 Empate. No pierdes ni ganas.`;
    }

    await enviartexto(`
🎲 *JUEGO DE DADOS*

> 👤 Tú sacaste: *${userDice}*
> 🤖 Bot sacó: *${botDice}*

${resultado}
> Balance: *¥${user.coins.toLocaleString()}*
`.trim());
  }
};