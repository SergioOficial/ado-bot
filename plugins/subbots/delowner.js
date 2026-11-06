export default {
  command: ["delowner", "eliminarowner"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, isOwnerCheck, getTargetFromMsg, jidToNumber, loadSubConfig, saveSubConfig, enviartexto } = ctx;
    if (!isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo el dueño.");
    const { jid } = getTargetFromMsg(m, args); if (!jid) return enviartexto("⚠️ Menciona a alguien.");
    const targetNum = jidToNumber(jid), selfNum = jidToNumber(sock.user.id);
    const cfg = loadSubConfig(selfNum); if (!cfg.owners || !cfg.owners.includes(targetNum)) return enviartexto(`⚠️ @${targetNum} no es owner.`);
    cfg.owners = cfg.owners.filter(n => n !== targetNum); saveSubConfig(selfNum, cfg); sock.subconfig = cfg;
    await sock.sendMessage(from, { text: `✅ @${targetNum} eliminado como owner.`, mentions: [jid] }, { quoted: m });
  }
};
