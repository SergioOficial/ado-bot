export default {
  command: ["minar", "mine"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cooldown = 3 * 60 * 1000; // 3 minutos
    if (now - (user.lastMinar || 0) < cooldown) {
      const remain = cooldown - (now - user.lastMinar);
      return enviartexto(`⏳ Tus herramientas están cansadas. Vuelve en *${Math.ceil(remain / 1000)}s*.`);
    }

    const minerales = [
      { nombre: "Carbón", exp: 10, oro: 30 },
      { nombre: "Hierro", exp: 25, oro: 100 },
      { nombre: "Oro", exp: 30, oro: 250 },
      { nombre: "Diamante", exp: 60, oro: 800 },
      { nombre: "Esmeralda", exp: 45, oro: 500 }
    ];
    const mina = minerales[Math.floor(Math.random() * minerales.length)];

    user.exp = (user.exp || 0) + mina.exp;
    user.oro = (user.oro || 0) + mina.oro;
    user.lastMinar = now;

    let msgExtra = "";
    user.nivel = user.nivel || 1;
    const expNecesaria = user.nivel * 100;

    if (user.exp >= expNecesaria) {
      user.nivel++;
      user.exp -= expNecesaria;
      msgExtra = `\n\n🎉 *¡SUBISTE DE NIVEL!* Ahora eres nivel *${user.nivel}* 🚀`;
    }

    await enviartexto(`
┏━━━〔 ⛏️ 𝐌𝐈𝐍𝐀𝐍𝐃𝐎 〕━━━┓
┃ ➤ Has encontrado *${mina.nombre}*.
┃ ➤ *EXP:* +${mina.exp} ✨
┃ ➤ *Oro:* +${mina.oro} ¥
┗━━━━━━━━━━━━━━━━━━━━━━━━┛${msgExtra}
${config.footer}
`.trim());
  }
};
