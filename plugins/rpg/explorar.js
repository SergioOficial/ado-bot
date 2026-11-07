export default {
  command: ["explorar", "explore"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 minutos
    if (now - (user.lastExplorar || 0) < cooldown) {
      const remain = cooldown - (now - user.lastExplorar);
      return enviartexto(`⏳ Estás recuperando energía. Vuelve en *${Math.ceil(remain / 60000)}m ${Math.ceil((remain % 60000) / 1000)}s*.`);
    }

    const lugares = [
      { nombre: "las Ruinas Antiguas", exp: 50, oro: 150 },
      { nombre: "el Bosque Oscuro", exp: 40, oro: 100 },
      { nombre: "la Cueva de Cristal", exp: 70, oro: 300 },
      { nombre: "el Castillo Abandonado", exp: 90, oro: 500 },
      { nombre: "el Volcán", exp: 100, oro: 1000 }
    ];
    const lugar = lugares[Math.floor(Math.random() * lugares.length)];

    user.exp = (user.exp || 0) + lugar.exp;
    user.oro = (user.oro || 0) + lugar.oro;
    user.lastExplorar = now;

    let msgExtra = "";
    user.nivel = user.nivel || 1;
    const expNecesaria = user.nivel * 100;

    if (user.exp >= expNecesaria) {
      user.nivel++;
      user.exp -= expNecesaria;
      msgExtra = `\n\n🎉 *¡SUBISTE DE NIVEL!* Ahora eres nivel *${user.nivel}* 🚀`;
    }

    await enviartexto(`
┏━━━〔 🗺️ 𝐄𝐗𝐏𝐋𝐎𝐑𝐀𝐍𝐃𝐎 〕━━━┓
┃ ➤ Exploraste *${lugar.nombre}*.
┃ ➤ *EXP:* +${lugar.exp} ✨
┃ ➤ *Oro:* +${lugar.oro} ¥
┗━━━━━━━━━━━━━━━━━━━━━━━━┛${msgExtra}
${config.footer}
`.trim());
  }
};
