import { Sticker } from "wa-sticker-formatter";
export default {
  command: ["brat"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    let textoBrat = args.join(" ").trim();
    if (!textoBrat) {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) textoBrat = quoted.conversation || quoted.extendedTextMessage?.text;
    }
    if (!textoBrat) return enviartexto('《✧》 Responde o escribe un texto.');
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    try {
      const res = await fetch(`https://skyzxu-brat.hf.space/brat?text=${encodeURIComponent(textoBrat)}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const sticker = new Sticker(buffer, { pack: config.botName, author: config.ownerName, type: 'full', quality: 70 });
      await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✔️", key: m.key } });
    } catch (e) { await enviartexto(`Error: ${e.message}`); }
  }
};
