export default {
  command: ["reiniciarrpg"],
  execute: async (ctx) => {
    const { enviartexto, sender, db } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    Object.assign(user, { oro: 0, exp: 0, nivel: 1, clase: "Novato" });
    await enviartexto("♻️ *Tu progreso RPG ha sido reiniciado.*");
  }
};
