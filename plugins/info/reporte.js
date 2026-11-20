
export default {
  command: ["reporte", "report", "sug", "suggest", "r"],
  category: "info",
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, sender, config, BOT_NAME } = ctx;
    const texto = args.join(" ").trim();

    if (!texto) {
      return enviartexto(`✍️ *Uso correcto:*\n> ${config.prefix[0]}reporte <tu mensaje o sugerencia>\n\nEjemplo:\n> ${config.prefix[0]}reporte El comando .play no funciona.`);
    }

    // Reacción para avisar que se está procesando
    await sock.sendMessage(from, { react: { text: "📩", key: m.key } });

    try {
      // Formatear el mensaje del reporte
      const numeroSender = sender.split("@")[0];
      const reporteTexto = `🚨 *NUEVO REPORTE* 🚨\n\n` +
        `👤 *De:* @${numeroSender}\n` +
        `📍 *Chat:* ${m.isGroup ? "Grupo" : "Privado"}\n` +
        `📝 *Mensaje:*\n${texto}`;

      // Extraer el primer owner del config (que es un objeto)
      const ownerPrincipal = config.owners[0];
      // Verificar si es objeto o string para armar el JID correctamente
      const ownerNumero = typeof ownerPrincipal === 'object' ? ownerPrincipal.number : ownerPrincipal;
      const ownerJid = `${ownerNumero}@s.whatsapp.net`;

      // Enviar al owner
      await sock.sendMessage(ownerJid, {
        text: reporteTexto,
        mentions: [sender]
      });

      // Confirmar al usuario
      await enviartexto("✅ *¡Reporte enviado!* Gracias por ayudar a mejorar el bot. Tu mensaje ha llegado a los desarrolladores.");
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (error) {
      console.error("Error en comando reporte:", error);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ Hubo un error al enviar el reporte.\n_${error.message}_`);
    }
  }
};