export default {
  command: ["setbotwm"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, args, enviartexto, jidToNumber, loadSubConfig, saveSubConfig } = ctx;
    const newWm = args.join(" ").trim(); if (!newWm) return enviartexto("⚠️ Ingresa el texto.");
    const selfNum = jidToNumber(sock.user.id); const cfg = loadSubConfig(selfNum); cfg.wm = newWm; saveSubConfig(selfNum, cfg); sock.subconfig = cfg;
    await enviartexto(`✅ Marca de agua: *${newWm}*`);
  }
};
