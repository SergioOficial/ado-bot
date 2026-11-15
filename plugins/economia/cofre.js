export default {
  command: ["cofre", "caja", "mysterybox"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = { coins: 0 };
    const user = db.users[sender];
    const precio = 5000;

    if ((user.coins || 0) < precio) return enviartexto(`❌ El cofre cuesta *¥${precio.toLocaleString()}* y no tienes suficiente.`);

    user.coins -= precio;
    const suerte = Math.random();
    let premio = 0;
    let mensaje = "";

    if (suerte < 0.05) { premio = 50000; mensaje = "💎 *¡JACKPOT!* Encontraste un diamante."; }
    else if (suerte < 0.20) { premio = 15000; mensaje = "🥇 ¡Encontraste una pepita de oro!"; }
    else if (suerte < 0.50) { premio = 5000; mensaje = "🥈 Encontraste plata, recuperas lo invertido."; }
    else if (suerte < 0.80) { premio = 1000; mensaje = "🥉 Solo encontraste unas monedas oxidadas."; }
    else { premio = 0; mensaje = "🕸️ El cofre estaba vacío... qué mala suerte."; }

    user.coins += premio;
    await enviartexto(`📦 *ABRIENDO COFRE...*\n\n${mensaje}\n> Ganancia: *¥${premio.toLocaleString()}*\n💰 Balance: *¥${user.coins.toLocaleString()}*\n${config.footer}`);
  }
};