export default {
  command: ["info"],
  execute: async (ctx) => {
    const { enviartexto, BOT_NAME, config } = ctx;
    await enviartexto(`🤖 *${BOT_NAME}*\n📦 Versión: ${config.version}\n👑 Owner: ${config.ownerName}\n📱 wa.me/${config.ownerNumber}\n\n${config.footer}`);
  }
};
