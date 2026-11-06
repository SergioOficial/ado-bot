export default {
  command: ["jadibot", "subbot", "code"],
  execute: async (ctx) => {
    const { sock, sender, from, args, enviartexto, jidToNumber, startSubbot, config, comando, db, isOwnerCheck } = ctx;

    // 1. LÓGICA PARA EL SUB-BOT (.code) - Gratis para todos
    if (comando === "code") {
      const num = jidToNumber(sender);
      // Validar que no sea un LID
      if (!num || num.length < 8 || num.length > 15 || /^1\d{14}$/.test(num)) {
        return enviartexto(`⚠️ *No puedo detectar tu número real.*\nEsto pasa en grupos. Usa: *${config.prefix}jadibot 5354386852*`);
      }
      return startSubbot(sock, sender, from, enviartexto, "code");
    }

    // 2. LÓGICA PARA EL PREM-BOT (.jadibot) - Solo Owners o Premium
    if (comando === "jadibot" || comando === "subbot") {
      // Verificar rango
      const user = db.users[sender];
      const esOwner = isOwnerCheck(sender, sock);
      const esPremium = user && user.premium;

      if (!esOwner && !esPremium) {
        return enviartexto(
          `💎 *Acceso Denegado*\n\n` +
          `El comando *${config.prefix}jadibot <número>* es exclusivo para usuarios *Premium*.\n\n` +
          `Si tienes un código, canjéalo con: *${config.prefix}canjear <código>*\n` +
          `O usa *${config.prefix}code* para crear un sub-bot con tu propio número (Gratis).`
        );
      }

      // Si es premium/owner, validar el número
      const target = args[0]?.replace(/\D/g, "");
      if (!target || target.length < 8) {
        return enviartexto(`⚠️ Uso: ${config.prefix}jadibot <número con código de país>\nEjemplo: ${config.prefix}jadibot 5354386852`);
      }
      
      await startSubbot(sock, `${target}@s.whatsapp.net`, from, enviartexto, "code");
    }
  }
};
