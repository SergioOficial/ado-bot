export default {
  command: ["tag", "tagall", "todos", "mencionar"],
  execute: async (ctx) => {
    const { sock, from, m, isGroup, sender, args, enviartexto, config, isOwnerCheck } = ctx;

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

      // Obtener la lista de todos los participantes y el mensaje
      const mentions = meta.participants.map(p => p.id);
      const textoExtra = args.join(" ") || "¡Atención a todos!";

      let texto = `${textoExtra}`;

      // Añadir las menciones visuales (opcional, pero ayuda a que se vea bien)
      // En grupos grandes, esto puede hacer que el mensaje sea muy largo, 
      // así que solo lo enviamos con el array de 'mentions'.
      
      await sock.sendMessage(from, {
        text: texto.trim(),
        mentions: mentions // 👈 Aquí es donde WhatsApp hace la magia de etiquetar
     }

    } catch (e) {
      console.error("Error en tagall:", e.message);
      await enviartexto(`❌ Error al intentar etiquetar: ${e.message}`);
    }
  }
};
