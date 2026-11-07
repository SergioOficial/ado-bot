export default {
  command: ["pescar", "fish"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cooldown = 2 * 60 * 1000; // 2 minutos
    if (now - (user.lastPescar || 0) < cooldown) {
      const remain = cooldown - (now - user.lastPescar);
      return enviartexto(`⏳ El mar está tranquilo. Vuelve en *${Math.ceil(remain / 1000)}s*.`);
    }

    const peces = [
      { nombre: "una Bota Vieja", exp: 5, oro: 10 },
      { nombre: "un Salmón", exp: 20, oro: 80 },
      { nombre: "un Pez Globo", exp: 15, oro: 60 },
      { nombre: "un Tiburón", exp: 35, oro: 200 },
      { nombre: "una Sirena", exp: 50, oro: 500 }
    ];
    const pesca = peces[Math.floor(Math.random() * peces.length)];

    user.exp = (user.exp || 0) + pesca.exp;
    user.oro = (user.oro || 0) + pesca.oro;
    user.lastPescar = now;

    let msgExtra = "";
    user.nivel = user.nivel || 1;
    const expNecesaria = user.nivel * 100;

    if (user.exp >= expNecesaria) {
      user.nivel++;
      user.exp -= expNecesaria;
      msgExtra = `\n\n🎉 *¡SUBISTE DE NIVEL!* Ahora eres nivel *${user.nivel}* 🚀`;
    }

    await enviartexto(`
┏━━━〔 🎣 𝐏𝐄𝐒𝐂𝐀𝐍𝐃𝐎 〕━━━┓
┃ ➤ Has pescado *${pesca.nombre}*.
┃ ➤ *EXP:* +${pesca.exp} ✨
┃ ➤ *Oro:* +${pesca.oro} ¥
┗━━━━━━━━━━━━━━━━━━━━━━━━┛${msgExtra}
${config.footer}
`.trim());
  }
};
