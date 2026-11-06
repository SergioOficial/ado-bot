export default {
  command: ["open", "abrir"],
  execute: async (ctx) => {
    const { sock, from, sender, isGroup, enviartexto, isOwnerCheck } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    try {
      const meta = await sock.groupMetadata(from);
      
      const adminIds = meta.participants.filter(p => p.admin !== null).flatMap(p => [p.id, p.lid, p.phoneNumber]).filter(Boolean);
      
      const esAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);
      if (!esAdmin) {
        return enviartexto("⚠️ Solo los administradores pueden abrir el grupo.");
      }

      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const botEsAdmin = adminIds.includes(botId) || adminIds.some(id => id && id.includes(sock.user.id.split(':')[0]));
      
      if (!botEsAdmin) {
        return enviartexto("⚠️ No puedo abrir el grupo porque *no soy administrador*. Por favor, dame admin y vuelve a intentarlo.");
      }

      // Ejecutar apertura
      await sock.groupSettingUpdate(from, 'not_announcement');
      await enviartexto("🔓 *Grupo abierto.*\nAhora todos los miembros pueden enviar mensajes.");

    } catch (e) {
      console.error("Error en open:", e);
      await enviartexto(`❌ Error al abrir: ${e.message}`);
    }
  }
};
