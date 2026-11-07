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
  command: ["boton1", "boton2", "boton3", "boton4", "boton5", "boton6", "botones"],
  execute: async (ctx) => {
    const { sock, from, m, comando, enviartexto, config } = ctx;

    if (comando === "boton1") {
      await sendInteractive(sock, m, from, {
        body: { text: '📋 *CÓDIGO DE INSTALACIÓN*\n\nEjecuta este comando en tu terminal:' },
        footer: { text: config.botName },
        header: { title: 'npm install levi-bot', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
              display_text: '📋 Copiar Comando',
              copy_code: 'npm install levi-bot',
              id: `copy_${Date.now()}`
            })
          }],
          messageParamsJson: ''
        }
      });
    }

    else if (comando === "boton2") {
      await sendInteractive(sock, m, from, {
        body: { text: '🔗 *ENLACES IMPORTANTES*\n\nVisita nuestro repositorio oficial:' },
        footer: { text: config.botName },
        header: { title: 'GitHub - Levi Bot', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 Ver GitHub',
              url: 'https://github.com/levi-hub805/Levi-bot-',
              merchant_url: 'https://github.com/levi-hub805/Levi-bot-'
            })
          }],
          messageParamsJson: ''
        }
      });
    }

    else if (comando === "boton3") {
      await sendInteractive(sock, m, from, {
        body: { text: '🎮 *MENÚ DE OPCIONES*\n\n¿Qué deseas hacer?' },
        footer: { text: config.botName },
        header: { title: 'Selecciona una opción', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📋 Ver Menú', id: `${config.prefix}menu` }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'ℹ️ Información', id: `${config.prefix}info` }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👑 Owner', id: `${config.prefix}creadores` }) }
          ],
          messageParamsJson: ''
        }
      });
    }

    else if (comando === "boton4") {
      await sendInteractive(sock, m, from, {
        body: { text: '📞 *SOPORTE TÉCNICO*\n\n¿Necesitas ayuda? Llámanos:' },
        footer: { text: config.botName },
        header: { title: `+${config.ownerNumber}`, hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'cta_call',
            buttonParamsJson: JSON.stringify({
              display_text: '📞 Llamar Ahora',
              phone_number: `+${config.ownerNumber}`
            })
          }],
          messageParamsJson: ''
        }
      });
    }

    else if (comando === "boton5") {
      await sendInteractive(sock, m, from, {
        body: { text: '📋 *SELECCIONA UNA OPCIÓN*' },
        footer: { text: 'Menú Principal' },
        header: { title: config.botName, hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: 'Abrir Menú',
              sections: [
                {
                  title: '📱 COMANDOS BÁSICOS',
                  rows: [
                    { id: `${config.prefix}menu`, title: '📋 Menú', description: 'Ver todos los comandos' },
                    { id: `${config.prefix}ping`, title: '🏓 Ping', description: 'Ver latencia del bot' },
                    { id: `${config.prefix}creadores`, title: '👑 Owner', description: 'Información del creador' }
                  ]
                },
                {
                  title: '🎮 COMANDOS DE GRUPO',
                  rows: [
                    { id: `${config.prefix}close`, title: '🔒 Cerrar Grupo', description: 'Cerrar el grupo' },
                    { id: `${config.prefix}open`, title: '🔓 Abrir Grupo', description: 'Abrir el grupo' }
                  ]
                }
              ]
            })
          }],
          messageParamsJson: ''
        }
      });
    }

    else if (comando === "boton6") {
      await sendInteractive(sock, m, from, {
        body: { text: '🎯 *PANEL DE CONTROL*\n\nSelecciona una acción rápida:' },
        footer: { text: config.botName },
        header: { title: 'Panel Principal', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '🌐 GitHub', url: 'https://github.com/levi-hub805/Levi-bot-', merchant_url: 'https://github.com/levi-hub805/Levi-bot-' }) },
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 Comando Inicio', copy_code: 'npm start' }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📋 Ver Menú', id: `${config.prefix}menu` }) }
          ],
          messageParamsJson: ''
        }
      });
    }

    else if (comando === "botones") {
      await enviartexto(
        `🧪 *COMANDOS DE PRUEBA - BOTONES INTERACTIVOS*\n\n` +
        `┌✦ *BOTÓN COPIAR*\n` +
        `│ ${config.prefix}boton1\n` +
        `│\n` +
        `├✦ *BOTÓN URL*\n` +
        `│ ${config.prefix}boton2\n` +
        `│\n` +
        `├✦ *BOTONES RÁPIDOS*\n` +
        `│ ${config.prefix}boton3\n` +
        `│\n` +
        `├✦ *BOTÓN LLAMADA*\n` +
        `│ ${config.prefix}boton4\n` +
        `│\n` +
        `├✦ *LISTA DESPLEGABLE*\n` +
        `│ ${config.prefix}boton5\n` +
        `│\n` +
        `└✦ *MÚLTIPLES BOTONES*\n` +
        `  ${config.prefix}boton6\n\n` +
        `✨ *Prueba cada uno y mira cómo funcionan!*`
      );
    }
  }
};
