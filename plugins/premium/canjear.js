export default {
  command: ["canjear", "redeem"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    const codigo = args[0]?.toUpperCase();

    if (!codigo) return enviartexto(`💎 Uso: ${config.prefix}canjear <código>`);

    if (!db.codes) db.codes = {}; // Inicializar si no existe

    if (!db.codes[codigo]) {
      return enviartexto("❌ El código ingresado no es válido o ya fue utilizado.");
    }

    // Verificar si el usuario ya es premium
    if (!db.users[sender]) db.users[sender] = {};
    if (db.users[sender].premium) {
      return enviartexto("⚠️ Ya eres un usuario Premium.");
    }

    // Dar premium y borrar el código
    db.users[sender].premium = true;
    delete db.codes[codigo];

    await enviartexto(`✅ *¡Felicidades!* Has canjeado el código y ahora eres *Premium*.\n\nAhora puedes usar el comando *${config.prefix}jadibot* para crear tu propio Sub-Bot.`);
  }
};
