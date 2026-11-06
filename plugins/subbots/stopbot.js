export default {
  command: ["stopbot", "stopjadibot"],
  execute: async (ctx) => {
    const { sender, enviartexto, jidToNumber, stopSubbot } = ctx;
    if (await stopSubbot(jidToNumber(sender))) await enviartexto("✅ Tu sub-bot ha sido detenido.");
    else await enviartexto("⚠️ No tienes sub-bot activo.");
  }
};
