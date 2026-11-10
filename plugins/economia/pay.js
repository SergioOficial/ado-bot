export default {
  command: ["pay", "pagar", "transferir", "dar"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, getTargetFromMsg } = ctx;

    const { jid: targetJid } = getTargetFromMsg(m, args);
    if (!targetJid) return enviartexto(`⚠️ Menciona a quién quieres pagarle y la cantidad.`);

    const amountStr = args[args.length - 1];
    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) return enviartexto(`⚠️ Ingresa una cantidad válida. Ejemplo: ${ctx.config.prefix[0]}pay @user 500`);

    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    
    if (!db.users[targetJid]) db.users[targetJid] = {};
    const target = db.users[targetJid];

    if ((user.coins || 0) < amount) {
      return enviartexto(`❌ No tienes suficientes coins. Tienes *¥${(user.coins || 0).toLocaleString()}*`);
    }

    user.coins -= amount;
    target.coins = (target.coins || 0) + amount;

    await sock.sendMessage(from, {
      text: `💸 *TRANSFERENCIA EXITOSA*\n\n@${sender.split("@")[0]} le pagó *¥${amount.toLocaleString()}* a @${targetJid.split("@")[0]}`,
      mentions: [sender, targetJid]
    }, { quoted: m });
  }
};