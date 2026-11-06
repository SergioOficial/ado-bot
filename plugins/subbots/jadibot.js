export default {
  command: ["jadibot", "subbot", "code"],
  execute: async (ctx) => {
    const { sock, sender, from, args, enviartexto, jidToNumber, startSubbot, config, comando } = ctx;
    if (comando === "code") {
      const num = jidToNumber(sender);
      if (!num || num.length < 8 || num.length > 15 || /^1\d{14}$/.test(num)) return enviartexto(`⚠️ Usa: *${config.prefix}jadibot 5354386852*`);
      return startSubbot(sock, sender, from, enviartexto, "code");
    }
    const target = args[0]?.replace(/\D/g, "");
    if (!target || target.length < 8) return enviartexto(`⚠️ Uso: ${config.prefix}jadibot <número>`);
    await startSubbot(sock, `${target}@s.whatsapp.net`, from, enviartexto, "code");
  }
};
