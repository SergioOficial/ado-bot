export default {
  command: ["give", "dar"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, getTargetFromMsg } = ctx;
    const { jid: targetJid } = getTargetFromMsg(m, args);
    if (!targetJid) return enviartexto(`🎁 Menciona a quién quieres darle coins.`);

    const monto = parseInt(args[args.length - 1]);
    if (isNaN(monto) || monto < 100) return enviartexto("❌ Debes especificar un monto (mínimo 100).");

    if (!db.users[sender]) db.users[sender] = { coins: 0 };
    const user = db.users[sender];
    
    if ((user.coins || 0) < monto) return enviartexto("❌ No tienes suficientes coins.");

    if (!db.users[targetJid]) db.users[targetJid] = { coins: 0 };
    const target = db.users[targetJid];

    user.coins -= monto;
    target.coins = (target.coins || 0) + monto;

    await sock.sendMessage(from, { text: `🎁 *REGALO DE COINS*\n\n@${sender.split('@')[0]} le dio *¥${monto.toLocaleString()}* a @${targetJid.split('@')[0]}.`, mentions: [sender, targetJid] }, { quoted: m });
  }
};