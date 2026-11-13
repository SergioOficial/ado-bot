export default {
  command: ["adoptar", "adopt"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    const animalesValidos = [
      "rana", "sirena", "araña", "unicornio", "hipogrifo", "dragon", "gato", "perro", "zorro", "lobo", 
      "caballo", "cerdo", "dinosaurio", "hada", "duende", "slime", "loro", "cacatua", "fenix", "quimera", 
      "lechuza", "leviatan", "oso"
    ];

    if (!args[0]) return enviartexto(`🐾 Uso: ${config.prefix[0]}adoptar <animal>\nEjemplo: ${config.prefix[0]}adoptar dragon`);

    const animal = args[0].toLowerCase();
    if (!animalesValidos.includes(animal)) return enviartexto("❌ Ese animal no está disponible para adopción.");

    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    if (!user.pets) user.pets = {};

    // Cooldown de 1 hora
    const now = Date.now();
    const cooldown = 60 * 60 * 1000;
    if (now - (user.lastAdopt || 0) < cooldown) {
      const remain = cooldown - (now - user.lastAdopt);
      const min = Math.floor(remain / 60000);
      return enviartexto(`⏳ El refugio está cerrado. Vuelve en *${min} minutos* para adoptar otro animal.`);
    }

    if (user.pets[animal]) return enviartexto(`⚠️ Ya tienes un/a *${animal}* adoptado/a.`);

    // Crear mascota
    user.pets[animal] = {
      name: animal.charAt(0).toUpperCase() + animal.slice(1),
      level: 1,
      points: 0,
      lastPet: 0,
      lastFeed: 0,
      lastWalk: 0,
      lastRename: 0
    };
    user.lastAdopt = now;

    await enviartexto(`
┏━━━〔 🐾 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 〕━━━┓
┃ ✨ ¡Has adoptado un/a *${animal}*!
┃
┃ 🏷️ *Nombre actual:* ${user.pets[animal].name}
┃ 📈 *Nivel:* 1
┃ ✨ *Puntos:* 0/100
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
> Usa *${config.prefix[0]}nombrar ${animal} <nombre>* para ponerle un nombre.
`.trim());
  }
};