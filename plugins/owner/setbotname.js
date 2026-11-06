export default {
  command: ["setbotname", "botnombre"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, args, enviartexto, jidToNumber, db, BOT_NAME } = ctx;
    const newName = args.join(" ").trim(), botJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    if (!newName) return enviartexto(`📛 *Nombre actual:* ${db.settings[botJid]?.botname || BOT_NAME}`);
    try {
      await sock.updateProfileName(newName);
      if (!db.settings[botJid]) db.settings[botJid] = {};
      db.settings[botJid].botname = newName;
      await enviartexto(`✅ *Nombre cambiado a:* ${newName}`);
    } catch (err) { await enviartexto("❌ Error al cambiar nombre."); }
  }
};
