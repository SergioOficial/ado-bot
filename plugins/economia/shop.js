export default {
  command: ["shop", "tienda"],
  execute: async (ctx) => {
    const { enviartexto, sender, args, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = { coins: 0, inventory: {} };
    const user = db.users[sender];

    const item = args[0]?.toLowerCase();
    const items = {
      escudo: { precio: 15000, nombre: "🛡️ Escudo Anti-Robo", desc: "Te protege de 1 robo." },
      amuleto: { precio: 25000, nombre: "🍀 Amuleto de Suerte", desc: "+10% de suerte por 1 hora." }
    };

    if (!item) {
      return enviartexto(`🛒 *TIENDA DE OBJETOS*\n\n` +
      `🛡️ *${config.prefix[0]}shop escudo* - ¥15,000 (Protege 1 robo)\n` +
      `🍀 *${config.prefix[0]}shop amuleto* - ¥25,000 (+10% suerte 1h)`);
    }

    if (!items[item]) return enviartexto("❌ Objeto no válido.");
    if ((user.coins || 0) < items[item].precio) return enviartexto("❌ No tienes suficientes coins.");

    user.coins -= items[item].precio;
    user.inventory[item] = (user.inventory[item] || 0) + 1;
    
    await enviartexto(`✅ ¡Has comprado *${items[item].nombre}*!\n> ${items[item].desc}\n💰 Balance: ¥${user.coins.toLocaleString()}`);
  }
};