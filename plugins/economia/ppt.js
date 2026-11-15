export default {
  command: ["ppt", "piedrapapel"],
  execute: async (ctx) => {
    const { enviartexto, sender, args, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = { coins: 0 };
    const user = db.users[sender];

    const apuesta = parseInt(args[0]);
    const eleccion = args[1]?.toLowerCase();

    const opciones = ["piedra", "papel", "tijera"];
    if (isNaN(apuesta) || apuesta < 100 || !opciones.includes(eleccion)) {
      return enviartexto(`✊ Uso: ${config.prefix[0]}ppt <apuesta> <piedra|papel|tijera>\nEjemplo: ${config.prefix[0]}ppt 500 piedra`);
    }

    if ((user.coins || 0) < apuesta) return enviartexto("❌ No tienes suficientes coins.");

    const botEleccion = opciones[Math.floor(Math.random() * opciones.length)];
    let resultado = "";

    if (eleccion === botEleccion) {
      resultado = "🤝 *¡Empate!* No pierdes ni ganas.";
    } else if (
      (eleccion === "piedra" && botEleccion === "tijera") ||
      (eleccion === "papel" && botEleccion === "piedra") ||
      (eleccion === "tijera" && botEleccion === "papel")
    ) {
      user.coins += apuesta;
      resultado = `🎉 *¡Ganaste ¥${apuesta.toLocaleString()}!*`;
    } else {
      user.coins -= apuesta;
      resultado = `💀 *¡Perdiste ¥${apuesta.toLocaleString()}!*`;
    }

    await enviartexto(`✊ *PIEDRA, PAPEL O TIJERA*\n\n👤 Tú: *${eleccion}*\n🤖 Bot: *${botEleccion}*\n\n${resultado}\n💰 Balance: ¥${user.coins.toLocaleString()}\n${config.footer}`);
  }
};