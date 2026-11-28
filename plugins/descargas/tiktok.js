import { descargarMedia } from "../../lib/descargas.js";

export default {
  command: ["tiktok", "tt", "ttdl"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const url = args[0];
    if (!url) return enviartexto(`❌ Uso: ${config?.prefix?.[0] || "."}tt <enlace de TikTok>`);
    if (!/(^|\.)tiktok\.com\//i.test(url.replace(/^https?:\/\//i, ""))) return enviartexto("❌ El enlace no es de TikTok.");

    const wait = await sock.sendMessage(from, { text: "⏳ Descargando TikTok…" }, { quoted: m }).catch(() => null);
    try {
      const result = await descargarMedia(url, "video");
      await sock.sendMessage(from, { video: result.buffer, mimetype: result.mime === "video/mp4" ? result.mime : "video/mp4", caption: "✅ *TikTok descargado*" }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      if (wait?.key) await sock.sendMessage(from, { delete: wait.key }).catch(() => {});
    } catch (error) {
      const message = `❌ TikTok: ${error.message}`;
      if (wait?.key) await sock.sendMessage(from, { text: message, edit: wait.key }).catch(() => enviartexto(message));
      else await enviartexto(message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
    }
  }
};
