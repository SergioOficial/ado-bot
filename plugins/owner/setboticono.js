export default {
  command: ["setboticono", "setboticon"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, args, enviartexto, jidToNumber, loadSubConfig, saveSubConfig } = ctx;
    const newIcon = args.join(" ").trim(); if (!newIcon) return enviartexto("⚠️ Ingresa el emoji.");
    const selfNum = jidToNumber(sock.user.id); const cfg = loadSubConfig(selfNum); cfg.icono = newIcon; saveSubConfig(selfNum, cfg); sock.subconfig = cfg;
    await enviartexto(`✅ Icono: *${newIcon}*`);
  }
};
