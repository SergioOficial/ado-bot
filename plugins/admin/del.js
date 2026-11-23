export default {
  command: ["del", "delete", "borrar"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, isOwnerCheck } = ctx;

    const quoted = m.message?.extendedTextMessage?.contextInfo;
    if (!quoted) {
      return enviartexto("⚠️ Debes *responder* al mensaje que quieres eliminar.");
    }

    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(from);
        const adminIds = meta.participants.filter(p => p.admin !== null).flatMap(p => [p.id, p.lid, p.phoneNumber]).filter(Boolean);
        
        const esAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);
        if (!esAdmin) {
          return enviartexto("⚠️ Solo los administradores pueden borrar mensajes.");
        }

        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botEsAdmin = adminIds.includes(botId) || adminIds.some(id => id && id.includes(sock.user.id.split(':')[0]));
        
        if (!botEsAdmin) {
          return enviartexto("⚠️ Necesito ser administrador para borrar mensajes de otros.");
        }
      } catch (e) {
        return enviartexto("❌ No se pudo verificar los permisos del grupo.");
      }
    }

    try {
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const isBotMsg = quoted.participant === botId || quoted.participant?.includes(sock.user.id.split(':')[0]);

      const key = {
        remoteJid: from,
        fromMe: isBotMsg,
        id: quoted.stanzaId,
        participant: quoted.participant || undefined
      };

      // Borrar el mensaje citado
      await sock.sendMessage(from, { delete: key });
      
      // Borrar el comando ".del" que enviaste
      await sock.sendMessage(from, { delete: m.key }).catch(() => {});

    } catch (e) {
      console.error("Error al borrar mensaje:", e);
      await enviartexto(`❌ No pude borrar el mensaje.\n_${e.message}_`);
    }
  }
};
