export default {
  command: ["trabajar"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const now = Date.now(), cooldown = 300000;
    if (now - (user.lastWork || 0) < cooldown) {
      const remain = cooldown - (now - user.lastWork);
      return enviartexto(`⌛ Vuelve en *${Math.floor(remain/60000)}m ${Math.floor((remain%60000)/1000)}s*.`);
    }
    const trabajos = ["mercader", "forjador", "aventurero", "alquimista", "minero", "vigilante", "cazador", "mago"];
    const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
    let mensajeResultado;
    if (Math.random() < 0.7) {
      const oro = Math.floor(Math.random() * 35000) + 250000, exp = Math.floor(Math.random() * 50) + 25;
      user.oro = (user.oro || 0) + oro; user.exp = (user.exp || 0) + exp;
      mensajeResultado = `✨ *Buen trabajo como ${trabajo}.*\nGanaste *¥${oro.toLocaleString()}* y *${exp} exp.*`;
    } else {
      const perdida = Math.floor(Math.random() * 20000) + 5000, exp = Math.floor(Math.random() * 10) + 5;
      user.oro = Math.max(0, (user.oro || 0) - perdida); user.exp = (user.exp || 0) + exp;
      mensajeResultado = `💢 *Trabajo fallido como ${trabajo}...*\nPerdiste *¥${perdida.toLocaleString()}* y ganaste *${exp} exp.*`;
    }
    user.lastWork = now;
    await enviartexto(`${mensajeResultado}\n\n💰 Balance: *¥${(user.oro || 0).toLocaleString()}*\n🏷️ Nivel: *${user.nivel || 1}*\n${config.footer}`);
  }
};
