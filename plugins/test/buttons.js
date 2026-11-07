import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

// ═══════════════════════════════════════════
// FUNCIÓN AUXILIAR PARA BOTONES INTERACTIVOS
// ═══════════════════════════════════════════
async function sendInteractive(sock, msg, remoteJid, interactiveMessage) {
  // Generamos el mensaje directamente sin el viewOnceMessage que causa conflictos
  const messageContent = generateWAMessageFromContent(remoteJid, {
    interactiveMessage: interactiveMessage
  }, {
    userJid: sock.user?.id,
    quoted: msg
  });

  await sock.relayMessage(remoteJid, messageContent.message, { messageId: messageContent.key.id });
}

export default {
  command: ["boton1", "boton2", "boton3", "botones"],
  execute: async (ctx) => {
    const { sock, from, m, comando, enviartexto, config } = ctx;

    // 🔗 1. BOTÓN URL (Abre un enlace)
    if (comando === "boton1" || comando === "boton2") {
      await sendInteractive(sock, m, from, {
        body: { text: '🔗 *ENLACES IMPORTANTES*\n\nVisita nuestro repositorio oficial en GitHub:' },
        footer: { text: config.botName },
        header: { title: 'GitHub - Levi Bot', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 Abrir GitHub',
              url: 'https://github.com/levi-hub805/Levi-bot-',
              merchant_url: 'https://github.com/levi-hub805/Levi-bot-'
            })
          }],
          messageParamsJson: ''
        }
      });
    }

    // 🎮 2. BOTONES DE RESPUESTA RÁPIDA (Ejecutan comandos)
    else if (comando === "boton3") {
      await sendInteractive(sock, m, from, {
        body: { text: '🎮 *MENÚ DE OPCIONES*\n\n¿Qué deseas hacer?' },
        footer: { text: config.botName },
        header: { title: 'Selecciona una opción', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [
            { 
              name: 'quick_reply', 
              buttonParamsJson: JSON.stringify({ display_text: '📋 Ver Menú', id: `${config.prefix}menu` }) 
            },
            { 
              name: 'quick_reply', 
              buttonParamsJson: JSON.stringify({ display_text: 'ℹ️ Información', id: `${config.prefix}info` }) 
            },
            { 
              name: 'quick_reply', 
              buttonParamsJson: JSON.stringify({ display_text: '👑 Owner', id: `${config.prefix}creadores` }) 
            }
          ],
          messageParamsJson: ''
        }
      });
    }

    // 🧪 3. AYUDA
    else if (comando === "botones") {
      await enviartexto(
        `🧪 *COMANDOS DE BOTONES*\n\n` +
        `➤ ${config.prefix}boton1 - Botón de URL\n` +
        `➤ ${config.prefix}boton3 - Botones de respuesta rápida\n\n` +
        `_Nota: Si ves texto en lugar de botones, es porque tu versión de WhatsApp no soporta esta función nativa._`
      );
    }
  }
};
