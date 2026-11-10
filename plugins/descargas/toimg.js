import sharp from "sharp";
import { downloadMediaMessage } from "../../lib/baileys.js";
import pino from "pino";
export default {
  command: ["toimg", "s2i", "sticker2img", "img"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.stickerMessage) return enviartexto("❌ Responde a un sticker.");
    if (quoted.stickerMessage.isAnimated) return enviartexto("❌ Sticker animado no soportado.");
    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
    try {
      const buffer = await downloadMediaMessage({ key: m.key, message: quoted }, "buffer", {}, { logger: pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage });
      const png = await sharp(buffer).png({ quality: 100 }).toBuffer();
      await sock.sendMessage(from, { image: png, caption: `🖼️ *Sticker a imagen*\n\n${config.footer}`, mimetype: "image/png" }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) { await enviartexto(`⚠️ Error: ${e.message}`); }
  }
};
