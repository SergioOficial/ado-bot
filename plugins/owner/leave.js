export default {
  command: ["leave", "salir"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, from, isGroup, enviartexto } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo se puede usar en grupos.");

    try {
      await enviartexto("👋 *Adiós a todos. El owner me ha pedido salir de este grupo.*");
      await sock.groupLeave(from);
    } catch (e) {
      console.error("Error en leave:", e.message);
      await enviartexto(`❌ Error al intentar salir: ${e.message}`);
    }
  }
};
