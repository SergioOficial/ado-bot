import { proto, generateWAMessageFromContent, WA_DEFAULT_EPHEMERAL } from "@whiskeysockets/baileys";

async function sendInteractive(sock, msg, remoteJid, interactiveMessage) {
  const messageContent = proto.Message.fromObject({
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage
      }
    }
  });

  const built = await generateWAMessageFromContent(remoteJid, messageContent, {
    userJid: sock.user?.id || sock.user?.jid,
    quoted: msg,
    ephemeralExpiration: WA_DEFAULT_EPHEMERAL
  });

  await sock.relayMessage(remoteJid, built.message, { messageId: built.key.id });
}

export default {
  command: ["botones", "menubotones", "boton"],
  execute: async (ctx) => {
    const { sock, from, m, config, PREFIX } = ctx;

    // Enlaces configurables (puedes cambiarlos por los tuyos)
    const CANAL_URL = "https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d";
    const GRUPO_URL = "https://chat.whatsapp.com/FAWaPaXIcbpLxpcq823WiE";
    const WEB_URL = "https://github.com/levi-hub805/Levi-bot-";

    // Creamos el array de botones tal como lo pediste
    const nativeButtons = [
      { 
        name: "cta_url", 
        buttonParamsJson: JSON.stringify({ display_text: "📢 Canal", url: CANAL_URL, merchant_url: CANAL_URL }) 
      },
      { 
        name: "cta_url", 
        buttonParamsJson: JSON.stringify({ display_text: "👥 Grupo", url: GRUPO_URL, merchant_url: GRUPO_URL }) 
      },
      { 
        name: "cta_url", 
        buttonParamsJson: JSON.stringify({ display_text: "🌐 Web", url: WEB_URL, merchant_url: WEB_URL }) 
      },
      { 
        name: "quick_reply", 
        buttonParamsJson: JSON.stringify({ display_text: "🤖 Sub-Bot", id: `${PREFIX}code` }) 
      }
    ];

    // Enviamos el mensaje interactivo
    await sendInteractive(sock, m, from, {
      body: { text: '🐾 *PANEL DE ENLACES*\n\nSelecciona una opción para continuar:' },
      footer: { text: config.botName },
      header: { 
        title: 'Levi-Bot Oficial', 
        hasMediaAttachment: false 
      },
      nativeFlowMessage: {
        buttons: nativeButtons,
        messageParamsJson: ''
      }
    });
  }
};
