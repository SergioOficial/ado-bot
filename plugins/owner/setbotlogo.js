export default {
  command: ["setbotlogo"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, args, enviartexto, jidToNumber, loadSubConfig, saveSubConfig } = ctx;
    const newLogo = args.join(" ").trim(); if (!newLogo) return enviartexto("⚠️ Ingresa la URL.");
    const selfNum = jidToNumber(sock.user.id); const cfg = loadSubConfig(selfNum); cfg.logo = newLogo; saveSubConfig(selfNum, cfg); sock.subconfig = cfg;
    await enviartexto("✅ Logo cambiado.");
  }
};
