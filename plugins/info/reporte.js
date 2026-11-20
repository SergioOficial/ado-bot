export default {
  command: ["report", "reporte", "sugerencia", "sug"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config, sender } = ctx;

    let texto = (Array.isArray(args) ? args.join(" ") : "").trim();
    if (!texto && m.quoted?.text) texto = m.quoted.text;

    const mtype = m.mtype || m.type || "";
    const tieneMedia = ["imageMessage", "videoMessage", "stickerMessage", "audioMessage", "documentMessage"].includes(mtype);

    if (!texto && !tieneMedia) {
      return enviartexto(
        `✧ *SISTEMA DE REPORTES* ✧\n\n` +
        `Puedes enviar un reporte, sugerencia o queja al Staff.\n\n` +
        `> *Ejemplo:* ${config.prefix[0]}report El bot no responde en el grupo X\n` +
        `> *Ejemplo con foto:* Responde a una imagen con *${config.prefix[0]}sug*`
      );
    }

    try {
      await sock.sendMessage(from, { react: { text: "📩", key: m.key } });

      const nombreUsuario = m.pushName || "Usuario Desconocido";
      const jidRemitente = sender || m.sender || m.key?.participant || m.key?.remoteJid || from;
      const numeroUsuario = jidRemitente.split("@")[0];

      let origen = "Chat Privado";
      if (from.endsWith("@g.us")) {
        try {
          const metadata = await sock.groupMetadata(from);
          origen = `Grupo: *${metadata.subject}*`;
        } catch {
          origen = "Grupo (No se pudo obtener el nombre)";
        }
      }

      // Detectar si viene de un sub-bot y usar el socket del bot principal
      const esSubbot = !!sock.esSubbot;
      const sockPrincipal = global.nucleo?.obtenerSock?.() || null;
      const sockEnvio = (esSubbot && sockPrincipal) ? sockPrincipal : sock;

      // Si es sub-bot y no hay principal disponible, avisar
      if (esSubbot && !sockPrincipal) {
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        return enviartexto("❌ El bot principal no está disponible ahora. Intenta de nuevo en unos segundos.");
      }

      const textoComando = m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || "";
      const comandoUsado = textoComando.replace(config.prefix[0], "").split(" ")[0].toLowerCase() || "reporte";
      const tituloTipo = comandoUsado === "sug" || comandoUsado === "sugerencia" ? "SUGERENCIA" : "REPORTE";

      // Indicar de qué cuenta sale el reporte
      const origenBot = esSubbot
        ? `🤖 *Bot:* Sub-bot (${sock.numeroSubbot || "desconocido"})`
        : `🤖 *Bot:* Principal`;

      const mensajeStaff =
        `🚨 *NUEVO ${tituloTipo}* 🚨\n\n` +
        `👤 *De:* \( {nombreUsuario} (+ \){numeroUsuario})\n` +
        `📍 *Origen:* ${origen}\n` +
        `${origenBot}\n` +
        `📝 *Mensaje:*\n${texto || "(Sin texto, ver archivo adjunto)"}`;

      const STAFF_GROUP = "120363413955265605@g.us";

      if (tieneMedia) {
        // Intentar reenviar el mensaje original (con media)
        try {
          await sockEnvio.sendMessage(STAFF_GROUP, {
            forward: m,
            caption: mensajeStaff
          });
        } catch {
          // Si el forward falla (típico entre cuentas distintas), mandar solo el texto
          await sockEnvio.sendMessage(STAFF_GROUP, {
            text: mensajeStaff + "\n\n⚠️ _Había un archivo adjunto que no se pudo reenviar desde el sub-bot._"
          });
        }
      } else {
        await sockEnvio.sendMessage(STAFF_GROUP, {
          text: mensajeStaff,
          mentions: [jidRemitente]
        });
      }

      await enviartexto(`✅ *¡${tituloTipo} enviado!*\n\nTu mensaje ha sido recibido por el equipo de Staff. Gracias por ayudar a mejorar el bot.`);
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al enviar al Staff:", e);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto("❌ Hubo un error interno al intentar enviar tu mensaje al Staff.");
    }
  }
};