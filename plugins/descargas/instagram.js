import { descargarMedia } from "../../lib/descargas.js";

export default {
  command: ["instagram", "ig"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = args[0];
    if (!url) return enviartexto("《✧》 Envíame un enlace público de Instagram.");
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) return enviartexto("《✧》 El enlace no parece de Instagram.");

    const wait = await sock.sendMessage(from, { text: "⏳ Descargando Instagram…" }, { quoted: m }).catch(() => null);
    try {
      const result = await descargarMedia(url, "video");
      const isImage = /\.(jpe?g|png|webp)$/i.test(result.fileName);
      const payload = isImage
        ? { image: result.buffer, caption: "✅ *Instagram descargado*" }
        : { video: result.buffer, caption: "✅ *Instagram descargado*", mimetype: "video/mp4" };
      await sock.sendMessage(from, payload, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      if (wait?.key) await sock.sendMessage(from, { delete: wait.key }).catch(() => {});
    } catch (error) {
      const message = `❌ Instagram: ${error.message}`;
      if (wait?.key) await sock.sendMessage(from, { text: message, edit: wait.key }).catch(() => enviartexto(message));
      else await enviartexto(message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
    }
  }
};
