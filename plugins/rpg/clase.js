export default {
  command: ["clase"],
  execute: async (ctx) => {
    const { enviartexto, sender, args, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const eleccion = args[0]?.toLowerCase();
    const opciones = ["guerrero", "mago", "arquero"];
    if (!eleccion) return enviartexto(`🎭 *Elige:*\n\n⚔️ ${config.prefix}clase guerrero\n🔮 ${config.prefix}clase mago\n🏹 ${config.prefix}clase arquero`);
    if (!opciones.includes(eleccion)) return enviartexto("❌ Clase inválida.");
    user.clase = eleccion.charAt(0).toUpperCase() + eleccion.slice(1);
    const desc = { guerrero: "⚔️ *Guerrero:* Fuerte y valiente.", mago: "🔮 *Mago:* Sabio y poderoso.", arquero: "🏹 *Arquero:* Rápido y preciso." };
    await enviartexto(`✨ Elegiste: *${user.clase}*\n\n${desc[eleccion]}`);
  }
};
