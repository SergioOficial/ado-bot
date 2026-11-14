import axios from "axios";
import yts from "yt-search";

const safeFileName = (name) => String(name || 'audio').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 50);
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ").trim();

    if (!query) return enviartexto(`《✧》Menciona el nombre o URL del video.`);

    const waitMsg = await sock.sendMessage(from, { text: `🔍 *Buscando:* "${query}"...` }, { quoted: m });

    try {
      let youtubeUrl = query;
      let videoInfo = null;

      if (!YT_REGEX.test(query)) {
        const search = await yts(query);
        if (!search.all || search.all.length === 0) throw new Error("No se encontraron resultados.");
        videoInfo = search.all[0];
        youtubeUrl = videoInfo.url;
      }

      // 🌐 Endpoint de Evogb
      const evogbUrl = `https://evogb.win/api/dl/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
      
      const res = await axios.get(evogbUrl, { timeout: 25000 });
      const data = res.data;

      // 🕵️‍♂️ Extracción robusta del enlace de descarga
      const audioUrl = 
        data.url || 
        data.download || 
        data.result?.url || 
        data.result?.download || 
        data.data?.url || 
        data.data?.download;

      if (!audioUrl) throw new Error("La API no devolvió un enlace válido.");

      const title = data.title || data.result?.title || videoInfo?.title || "Audio de YouTube";
      const author = data.author || data.result?.author || videoInfo?.author?.name || "YouTube";

      const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 40000 });
      const audioBuffer = Buffer.from(audioRes.data);

      const captionEdit = 
        `✅ *Encontrada:*\n\n` +
        `🎵 *Título:* ${title}\n` +
        `👤 *Canal:* ${author}\n` +
        `🔗 *URL:* ${youtubeUrl}\n\n` +
        `> _Enviando audio..._`;

      await sock.sendMessage(from, { text: captionEdit, edit: waitMsg.key }).catch(() => {});

      await sock.sendMessage(from, {
        audio: audioBuffer,
        fileName: `${safeFileName(title)}.mp3`,
        mimetype: "audio/mpeg"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en play (Evogb):", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { text: `❌ *Error:* ${e.message}`, edit: waitMsg.key }).catch(() => {});
    }
  }
};