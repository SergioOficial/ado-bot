export default {
  command: ["inspect", "inspeccionar"],
  execute: async (ctx) => {
    const { sock, from, m, args, isGroup, enviartexto } = ctx;
    const text = args[0];

    if (!text && !isGroup) return enviartexto('《✧》 Ingresa un enlace de grupo o escribe el comando dentro de un grupo.');

    try {
      // Si es un enlace de grupo
      if (text && text.includes('chat.whatsapp.com/')) {
        const code = text.split('chat.whatsapp.com/')[1];
        const inviteInfo = await sock.groupGetInviteInfo(code);
        
        let caption = `🆔 *ID:* ${inviteInfo.id}\n\n`;
        caption += `🏷️ *Nombre:* ${inviteInfo.subject}\n\n`;
        caption += `📄 *Descripción:* ${inviteInfo.desc || 'No encontrada'}\n\n`;
        caption += `👥 *Miembros:* ${inviteInfo.size}\n\n`;
        caption += `📢 *Anuncios:* ${inviteInfo.announce ? '✅' : '❌'}\n`;
        caption += `🏘️ *Es Comunidad:* ${inviteInfo.isCommunity ? '✅' : '❌'}`;

        return enviartexto(caption);
      }

      // Si está en un grupo, inspecciona el grupo actual
      if (isGroup) {
        const meta = await sock.groupMetadata(from);
        const pp = await sock.profilePictureUrl(from, 'image').catch(() => null);
        const inviteCode = await sock.groupInviteCode(from).catch(() => null);

        let caption = `🆔 *ID:* ${meta.id}\n\n`;
        caption += `🏷️ *Nombre:* ${meta.subject}\n\n`;
        caption += `📄 *Descripción:*\n${meta.desc || 'No encontrada'}\n\n`;
        caption += `👥 *Miembros:* ${meta.participants.length}\n\n`;
        caption += `🔗 *Enlace:* ${inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : 'No disponible'}\n\n`;
        
        const admins = meta.participants.filter(p => p.admin).map(p => `@${String(p.id).split('@')[0]}`);
        caption += `🛡️ *Admins (${admins.length}):*\n${admins.join('\n')}`;

        await sock.sendMessage(from, { 
          image: pp ? { url: pp } : null,
          text: caption, 
          mentions: meta.participants.filter(p => p.admin).map(p => p.id) 
        }, { quoted: m });
      }
    } catch (e) {
      await enviartexto(`❌ Error al inspeccionar: ${e.message}`);
    }
  }
};