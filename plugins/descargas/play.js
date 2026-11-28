import yts from "yt-search";
import { descargarMedia, validarEnlaceDescarga } from "../../lib/descargas.js";

const safeFileName = (name) => String(name || "audio").replace(/[/\\?%*:|"<>]/g, "-").slice(0, 70);

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio", "audio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ").trim();
    if (!query) return enviartexto(`《✧》 Uso: ${config?.prefix?.[0] || "."}play <nombre o enlace de YouTube>`);

    const wait = await sock.sendMessage(from, { text: "🔎 Buscando y descargando audio…" }, { quoted: m }).catch(() => null);
    try {
      let url = query, title = "Audio de YouTube";
      if (!/^https?:\/\//i.test(query)) {
        const search = await yts(query);
        const video = search.videos?.[0];
        if (!video?.url) throw new Error("No encontré ese contenido en YouTube.");
        url = video.url;
        title = video.title;
      } else {
        url = validarEnlaceDescarga(query);
        if (!/youtube\.com|youtu\.be/i.test(new URL(url).hostname)) throw new Error("Usa un enlace o nombre de YouTube.");
      }
      const result = await descargarMedia(url, "audio");
      await sock.sendMessage(from, { audio: result.buffer, mimetype: "audio/mpeg", fileName: `${safeFileName(title)}.mp3`, ptt: false }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      if (wait?.key) await sock.sendMessage(from, { delete: wait.key }).catch(() => {});
    } catch (error) {
      const message = `❌ No pude descargar el audio: ${error.message}`;
      if (wait?.key) await sock.sendMessage(from, { text: message, edit: wait.key }).catch(() => enviartexto(message));
      else await enviartexto(message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
    }
  }
};
