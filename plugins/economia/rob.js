export default {
  command: ["rob", "robar", "steal"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, config, getTargetFromMsg } = ctx;

    const { jid: targetJid } = getTargetFromMsg(m, args);
    if (!targetJid) return enviartexto(`⚠️ Menciona a quién quieres robar.`);

    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    const target = db.users[targetJid];

    const now = Date.now();
    const cooldown = 60 * 60 * 1000; // 1 hora

    if (now - (user.lastRob || 0) < cooldown) {
      const remain = cooldown - (now - user.lastRob);
      return enviartexto(`⏳ La policía te está buscando. Vuelve en *${Math.floor(remain / 60000)}m*`);
    }

    if (!target || target.coins < 100) {
      return enviartexto(`⚠️ @${targetJid.split("@")[0]} es demasiado pobre, no vale la pena robarle.`);
    }

    user.lastRob = now;
    const suerte = Math.random();

    if (suerte < 0.4) {
      // Éxito
      const robado = Math.floor(target.coins * 0.2); // 20% de sus coins
      target.coins -= robado;
      user.coins = (user.coins || 0) + robado;

      await sock.sendMessage(from, { 
        text: `🦹‍♂️ *¡ROBO EXITOSO!*\n\nLe robaste *¥${robado.toLocaleString()}* coins a @${targetJid.split("@")[0]}`, 
        mentions: [targetJid] 
      }, { quoted: m });
    } else {
      // Fallo
      const multa = Math.floor(user.coins * 0.1) || 100;
      user.coins = Math.max(0, user.coins - multa);

      await enviartexto(`🚨 *¡TE ATRAPARON!*\n\nIntentaste robar pero fallaste. Tuviste que pagar una multa de *¥${multa.toLocaleString()}* coins.`);
    }
  }
};