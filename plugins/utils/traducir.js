import translate from '@vitalets/google-translate-api';

export default {
  command: ['translate', 'trad', 'traducir'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const defaultLang = 'es';
    
    if (!args[0]) return enviartexto('《✧》 Ingresa el idioma seguido del texto que quieras traducir.');

    let lang = args[0];
    let text = args.slice(1).join(' ');
    
    // Si el texto viene citado
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!text && quoted) text = quoted.conversation || quoted.extendedTextMessage?.text;

    if ((lang || '').length !== 2) {
      lang = defaultLang;
      text = args.join(' ') || (quoted ? (quoted.conversation || quoted.extendedTextMessage?.text) : null);
    }

    if (!text) return enviartexto('《✧》 No hay texto para traducir.');

    try {
      await sock.sendMessage(from, { react: { text: '🕒', key: m.key } });
      const result = await translate(text, { to: lang, autoCorrect: true });
      await sock.sendMessage(from, { text: result.text }, { quoted: m });
      await sock.sendMessage(from, { react: { text: '✔️', key: m.key } });
    } catch (e) {
      await sock.sendMessage(from, { react: { text: '✖️', key: m.key } });
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};