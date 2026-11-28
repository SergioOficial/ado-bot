import { descargarMedia } from "../../lib/descargas.js";

export default {
  command: ["fb", "facebook", "fbdl"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = args[0];
    if (!url) return enviartexto("《✧》 Envíame un enlace público de Facebook.");
    if (!/^https?:\/\/(www\.)?(facebook\.com|fb\.watch|fb\.com)\//i.test(url)) return enviartexto("《✧》 El enlace no parece de Facebook.");

    const wait = await sock.sendMessage(from, { text: "⏳ Descargando Facebook…" }, { quoted: m }).catch(() => null);
    try {
      const result = await descargarMedia(url, "video");
      await sock.sendMessage(from, { video: result.buffer, caption: "✅ *Facebook descargado*", mimetype: "video/mp4" }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      if (wait?.key) await sock.sendMessage(from, { delete: wait.key }).catch(() => {});
    } catch (error) {
      const message = `❌ Facebook: ${error.message}`;
      if (wait?.key) await sock.sendMessage(from, { text: message, edit: wait.key }).catch(() => enviartexto(message));
      else await enviartexto(message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
    }
  }
};
