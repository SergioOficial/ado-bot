import axios from "axios";
import yts from "yt-search";

const safeFileName = (name) => String(name || 'video').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 50);
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

export default {
  command: ["play2", "ytmp4", "mp4", "ytvideo", "playvideo"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ").trim();

    if (!query) {
      return enviartexto(`🎬 *REPRODUCTOR DE VIDEO*\n\nUso: ${config.prefix[0]}play2 <canción o enlace>\nEjemplo: ${config.prefix[0]}play2 faded alan walker`);
    }

    const waitMsg = await sock.sendMessage(from, { text: `🔍 *Buscando:* "${query}"...` }, { quoted: m });

    try {
      let youtubeUrl = query;
      let videoInfo = null;

      if (!YT_REGEX.test(query)) {
        const search = await yts(query);
        if (!search.all || search.all.length === 0) throw new Error("No se encontraron resultados en YouTube.");
        
        videoInfo = search.all[0];
        youtubeUrl = videoInfo.url;
      }

      const apiKey = process.env.NATSU_API_KEY || "";
      const apiUrl = `https://natsu-api.darkcore.xyz/api/ytmp4?url=${encodeURIComponent(youtubeUrl)}&apikey=${apiKey}`;
      
      const res = await axios.get(apiUrl, { timeout: 30000 });
      const data = res.data;

      const videoUrl = 
        data.data?.url || 
        data.data?.download || 
        data.result?.url || 
        data.url || 
        data.download;

      if (!videoUrl) {
        throw new Error("La API no devolvió un enlace de descarga válido.");
      }

      const title = data.data?.title || data.result?.title || videoInfo?.title || "Video de YouTube";
      const author = data.data?.author || data.result?.author || videoInfo?.author?.name || "YouTube";

      const videoRes = await axios.get(videoUrl, { 
        responseType: 'arraybuffer',
        timeout: 60000 
      });
      const videoBuffer = Buffer.from(videoRes.data);

      const captionEdit = 
        `✅ *Encontrado:*\n\n` +
        `🎬 *Título:* ${title}\n` +
        `👤 *Canal:* ${author}\n` +
        `🔗 *URL:* ${youtubeUrl}\n\n` +
        `> _Enviando video..._`;

      await sock.sendMessage(from, { text: captionEdit, edit: waitMsg.key }).catch(() => {});

      await sock.sendMessage(from, {
        video: videoBuffer,
        fileName: `${safeFileName(title)}.mp4`,
        mimetype: "video/mp4"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en play2 (Natsu):", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      
      await sock.sendMessage(from, { 
        text: `❌ *Error al descargar el video.*\n🔎 Detalle: _${e.message}_`, 
        edit: waitMsg.key 
      }).catch(() => {
        enviartexto(`❌ Error: ${e.message}`);
      });
    }
  }
};