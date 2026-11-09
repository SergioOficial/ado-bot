export default {
  command: ["tag", "tagall", "todos", "mencionar"],
  execute: async (ctx) => {
    const { sock, from, isGroup, sender, args, enviartexto, isOwnerCheck } = ctx;

    if (!isGroup) {
      return enviartexto("⚠️ Este comando solo se puede usar en grupos.");
    }

    try {
      const meta = await sock.groupMetadata(from);
      
      // Verificar si el que manda el comando es admin u owner
      const adminIds = meta.participants
        .filter(p => p.admin !== null)
        .flatMap(p => [p.id, p.lid, p.phoneNumber])
        .filter(Boolean);
        
      const esAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);

      if (!esAdmin) {
        return enviartexto("⚠️ Solo los administradores pueden usar este comando.");
      }

      // Obtener los JIDs de todos los participantes para las menciones invisibles
      const mentions = meta.participants.map(p => p.id || p.lid).filter(Boolean);
      
      // El mensaje que se verá en el grupo
      const textoExtra = args.join(" ") || "¡Atención a todos!";

      // Enviamos SOLO texto (sin { quoted: m }) y con el array de menciones
      await sock.sendMessage(from, {
        text: textoExtra,
        mentions: mentions 
      });

    } catch (e) {
      console.error("Error en tagall:", e.message);
      await enviartexto(`❌ Error al intentar etiquetar: ${e.message}`);
    }
  }
};