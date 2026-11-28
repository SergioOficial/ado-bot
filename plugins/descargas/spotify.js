import axios from "axios";
import yts from "yt-search";
import { descargarMedia } from "../../lib/descargas.js";

export default {
  command: ["spotify", "sp", "spt"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const url = args[0];
    if (!url) return enviartexto(`🎵 Uso: ${config?.prefix?.[0] || "."}sp <enlace de Spotify>`);
    if (!/^https?:\/\/(open\.)?spotify\.com\//i.test(url) && !/^https?:\/\/spoti\.fi\//i.test(url)) {
      return enviartexto("⚠️ El enlace no parece ser de Spotify.");
    }

    const wait = await sock.sendMessage(from, { text: "🔎 Buscando la canción…" }, { quoted: m }).catch(() => null);
    try {
      // Spotify no entrega un MP3 descargable: se usa el título público para buscar
      // una versión equivalente en YouTube, sin intentar saltar DRM.
      const meta = await axios.get("https://open.spotify.com/oembed", { params: { url }, timeout: 15000 });
      const title = String(meta.data?.title || "").trim();
      if (!title) throw new Error("Spotify no devolvió el título de la canción.");
      const search = await yts(title);
      const video = search.videos?.[0];
      if (!video?.url) throw new Error("No encontré una coincidencia pública en YouTube.");
      const result = await descargarMedia(video.url, "audio");
      await sock.sendMessage(from, { audio: result.buffer, mimetype: "audio/mpeg", fileName: `${title.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 70)}.mp3`, ptt: false }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      if (wait?.key) await sock.sendMessage(from, { delete: wait.key }).catch(() => {});
    } catch (error) {
      const message = `❌ Spotify: ${error.message}`;
      if (wait?.key) await sock.sendMessage(from, { text: message, edit: wait.key }).catch(() => enviartexto(message));
      else await enviartexto(message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
    }
  }
};
