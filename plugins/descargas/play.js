import play from "play-dl";
import yts from "yt-search";

const safeFileName = (name) => String(name || 'audio').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 50);
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
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

      const info = await play.video_basic_info(youtubeUrl);
      const title = info.video_details.title || videoInfo?.title || "Audio de YouTube";
      const author = info.video_details.channel?.name || videoInfo?.author?.name || "YouTube";

      const source = await play.stream(youtubeUrl, { quality: 2 });
      const chunks = [];
      for await (const chunk of source.stream) chunks.push(chunk);
      const audioBuffer = Buffer.concat(chunks);

      const captionEdit =
        `✅ *Encontrada:*\n\n` +
        `🎵 *Título:* ${title}\n` +
        `👤 *Canal:* ${author}\n` +
        `🔗 *URL:* ${youtubeUrl}\n\n` +
        `> _Enviando audio..._`;

      await sock.sendMessage(from, { text: captionEdit, edit: waitMsg.key }).catch(() => {});

      await sock.sendMessage(from, {
        audio: audioBuffer,
        fileName: `${safeFileName(title)}.opus`,
        mimetype: "audio/ogg; codecs=opus"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en play (play-dl):", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { text: `❌ *Error:* ${e.message}`, edit: waitMsg.key }).catch(() => {});
    }
  }
};
