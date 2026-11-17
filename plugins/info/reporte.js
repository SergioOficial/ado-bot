const STAFF_GROUP_ID = "120363413955265605@g.us"; 

export default {
  command: ["report", "reporte", "sugerencia", "sug"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    let texto = (Array.isArray(args) ? args.join(" ") : "").trim();
    if (!texto && m.quoted?.text) texto = m.quoted.text;

  
    const mtype = m.mtype || "";
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
      const numeroUsuario = m.sender.split("@")[0];
      
      let origen = "Chat Privado";
      if (from.endsWith("@g.us")) {
        try {
          const metadata = await sock.groupMetadata(from);
          origen = `Grupo: *${metadata.subject}*`;
        } catch {
          origen = "Grupo (No se pudo obtener el nombre)";
        }
      }

      
      const comandoUsado = (m.text || "").replace(config.prefix[0], "").split(" ")[0].toLowerCase() || "reporte";
      const tituloTipo = comandoUsado === "sug" || comandoUsado === "sugerencia" ? "SUGERENCIA" : "REPORTE";

      
      const mensajeStaff = 
        `🚨 *NUEVO ${tituloTipo}* 🚨\n\n` +
        `👤 *De:* ${nombreUsuario} (+${numeroUsuario})\n` +
        `📍 *Origen:* ${origen}\n` +
        `📝 *Mensaje:*\n${texto || "(Sin texto, ver archivo adjunto)"}`;

      
      if (tieneMedia) {
       
        await sock.sendMessage(STAFF_GROUP_ID, {
          forward: m,
          text: mensajeStaff
        });
      } else {
        
        await sock.sendMessage(STAFF_GROUP_ID, {
          text: mensajeStaff,
          mentions: [m.sender]
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