export default {
  command: ["close", "cerrar"],
  execute: async (ctx) => {
    const { sock, from, sender, isGroup, enviartexto, isOwnerCheck } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    try {
      const meta = await sock.groupMetadata(from);
      
      // Extraemos TODOS los IDs (reales y LIDs) de los administradores
      const adminIds = meta.participants.filter(p => p.admin !== null).flatMap(p => [p.id, p.lid, p.phoneNumber]).filter(Boolean);
      
      const esAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);
      if (!esAdmin) {
        return enviartexto("⚠️ Solo los administradores pueden cerrar el grupo.");
      }

      // Verificar si el bot es admin
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const botEsAdmin = adminIds.includes(botId) || adminIds.some(id => id && id.includes(sock.user.id.split(':')[0]));
      
      if (!botEsAdmin) {
        return enviartexto("⚠️ No puedo cerrar el grupo porque *no soy administrador*. Por favor, dame admin y vuelve a intentarlo.");
      }

      // Ejecutar cierre
      await sock.groupSettingUpdate(from, 'announcement');
      await enviartexto("🔒 *Grupo cerrado.*\nAhora solo los administradores pueden enviar mensajes.");

    } catch (e) {
      console.error("Error en close:", e);
      await enviartexto(`❌ Error al cerrar: ${e.message}`);
    }
  }
};
