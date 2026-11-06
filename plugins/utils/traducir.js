import axios from "axios";

export default {
  command: ["traducir", "translate", "tl"],
  execute: async (ctx) => {
    const { m, args, enviartexto, config } = ctx;
    let text = args.join(" ").trim();
    let lang = "es";

    // Si el usuario responde a un mensaje, traduce ese mensaje
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      text = quoted.conversation || quoted.extendedTextMessage?.text;
      if (args[0]) lang = args[0]; // Si escribe .tl en, traduce a inglés
    } else if (!text) {
      return enviartexto(`🌍 Uso: ${config.prefix}traducir <texto> [idioma_destino]\nEjemplo: ${config.prefix}traducir Hello world`);
    }

    await ctx.sock.sendMessage(ctx.from, { react: { text: "🌍", key: m.key } });

    try {
      // API gratuita de Google Translate
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await axios.get(url);
      const translatedText = res.data[0].map(item => item[0]).join('');

      await enviartexto(`🌍 *Traducción (${lang}):*\n\n${translatedText}`);
    } catch (e) {
      await enviartexto("❌ Error al traducir el texto.");
    }
  }
};
