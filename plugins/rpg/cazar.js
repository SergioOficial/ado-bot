export default {
  command: ["cazar"],
  execute: async (ctx) => {
    const { enviartexto, sender, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const exp = Math.floor(Math.random() * 40) + 10;
    user.exp = (user.exp || 0) + exp; user.nivel = user.nivel || 1;
    if (user.exp >= (user.nivel * 100)) {
      user.nivel++; user.exp -= (user.nivel - 1) * 100;
      await enviartexto(`⚡ *¡Subiste al nivel ${user.nivel}!* 🥳\n${config.footer}`);
    } else {
      await enviartexto(`🏹 *Cazaste un monstruo y ganaste ${exp} exp.* ⭐\n${config.footer}`);
    }
  }
};
