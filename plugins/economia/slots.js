export default {
  command: ["slots", "tragaperras", "tragamonedas"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    user.coins = user.coins || 0;

    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) return enviartexto(`🎰 Uso: *${config.prefix[0]}slots <apuesta>*`);
    if (user.coins < bet) return enviartexto(`❌ No tienes suficientes coins.`);

    const emojis = ["🍎", "🍇", "🍒", "💎", "7️⃣"];
    const slot1 = emojis[Math.floor(Math.random() * emojis.length)];
    const slot2 = emojis[Math.floor(Math.random() * emojis.length)];
    const slot3 = emojis[Math.floor(Math.random() * emojis.length)];

    let multiplicador = 0;
    if (slot1 === slot2 && slot2 === slot3) {
      multiplicador = slot1 === "7️⃣" ? 10 : (slot1 === "💎" ? 5 : 3);
    } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
      multiplicador = 1.5;
    }

    const ganancia = Math.floor(bet * multiplicador);
    user.coins = user.coins - bet + ganancia;

    const mensaje = `
┏━━━〔 🎰 𝐒𝐋𝐎𝐓𝐒 〕━━━┓
┃
┃    [ ${slot1} | ${slot2} | ${slot3} ]
┃
┃ ➤ *Apuesta:* ¥${bet.toLocaleString()}
┃ ➤ *Resultado:* ${multiplicador > 0 ? `¡Ganaste ¥${ganancia.toLocaleString()}! (x${multiplicador})` : `Perdiste ¥${bet.toLocaleString()}`}
┃
┃ 💰 *Balance:* ¥${user.coins.toLocaleString()}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
`;
    await enviartexto(mensaje.trim());
  }
};