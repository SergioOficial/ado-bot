export default {
  command: ["addpremium", "setpremium"],
  isOwner: true,
  execute: async (ctx) => {
    const { m, args, enviartexto, getTargetFromMsg, jidToNumber, db } = ctx;
    const { jid: targetJid } = getTargetFromMsg(m, args);
    
    if (!targetJid) return enviartexto("⚠️ Menciona a alguien o responde a su mensaje.");
    
    if (!db.users[targetJid]) db.users[targetJid] = {};
    db.users[targetJid].premium = true;

    await ctx.sock.sendMessage(ctx.from, { 
      text: `✅ @${jidToNumber(targetJid)} ahora es usuario *Premium*.`, 
      mentions: [targetJid] 
    }, { quoted: m });
  }
};
