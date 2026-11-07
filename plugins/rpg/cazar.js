export default {
  command: ["cazar", "hunt"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cooldown = 2 * 60 * 1000; // 2 minutos
    if (now - (user.lastCazar || 0) < cooldown) {
      const remain = cooldown - (now - user.lastCazar);
      return enviartexto(`⏳ Descansa un poco. Vuelve en *${Math.ceil(remain / 1000)}s*.`);
    }

    const presas = ["un Jabalí", "un Lobo Salvaje", "un Oso", "un Dragón Bebé", "un Slime Gigante"];
    const presa = presas[Math.floor(Math.random() * presas.length)];
    const expGanada = Math.floor(Math.random() * 25) + 15; // 15 - 40 EXP
    const oroGanado = Math.floor(Math.random() * 100) + 50; // 50 - 150 Oro

    user.exp = (user.exp || 0) + expGanada;
    user.oro = (user.oro || 0) + oroGanado;
    user.lastCazar = now;

    let msgExtra = "";
    user.nivel = user.nivel || 1;
    const expNecesaria = user.nivel * 100;

    if (user.exp >= expNecesaria) {
      user.nivel++;
      user.exp -= expNecesaria;
      msgExtra = `\n\n🎉 *¡SUBISTE DE NIVEL!* Ahora eres nivel *${user.nivel}* 🚀`;
    }

    await enviartexto(`
┏━━━〔 🏹 𝐂𝐀𝐙𝐀𝐍𝐃𝐎 〕━━━┓
┃ ➤ Has cazado *${presa}*.
┃ ➤ *EXP:* +${expGanada} ✨
┃ ➤ *Oro:* +${oroGanado} ¥
┗━━━━━━━━━━━━━━━━━━━━━━━━┛${msgExtra}
${config.footer}
`.trim());
  }
};
