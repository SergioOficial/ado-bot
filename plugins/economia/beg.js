export default {
  command: ["beg", "mendigar", "limosna"],
  execute: async (ctx) => {
    const { sender, enviartexto, db } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cooldown = 3 * 60 * 1000; // 3 minutos

    if (now - (user.lastBeg || 0) < cooldown) {
      return enviartexto(`⏳ Espera un poco antes de volver a mendigar.`);
    }

    user.lastBeg = now;
    const reward = Math.floor(Math.random() * 200) + 50; // 50 - 250 coins
    user.coins = (user.coins || 0) + reward;

    const respuestas = [
      "Un anciano te dio",
      "Encontraste en el suelo",
      "Un turista te regaló",
      "Vendiste una botella y ganaste",
      "Alguien sintió lástima y te dio"
    ];
    const frase = respuestas[Math.floor(Math.random() * respuestas.length)];

    await enviartexto(`🥺 *MENDIGANDO...*\n\n${frase} *¥${reward.toLocaleString()}* coins.\n> Balance: *¥${user.coins.toLocaleString()}*`);
  }
};