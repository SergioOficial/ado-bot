import axios from "axios";
import playdl from "play-dl";

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const text = args.join(" ").trim();

    if (!text) {
      return enviartexto(`《✧》Menciona el nombre o URL del video que deseas descargar.`);
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      // 1. Buscar el video con yt-search
      const { default: yts } = await import("yt-search");
      const search = await yts(text);
      
      if (!search.all || search.all.length === 0) {
        throw new Error("No se encontraron resultados en YouTube.");
      }

      const videoUrl = search.all[0].url;
      const title = search.all[0].title;

      // 2. Obtener el enlace de audio con play-dl
      const streamInfo = await playdl.stream(videoUrl, { quality: 2 });
      const audioUrl = streamInfo.url;

      if (!audioUrl) throw new Error("No se pudo obtener el enlace de audio.");

      // 3. Descargar el audio con axios como Buffer
      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Range": "bytes=0-"
        },
        timeout: 30000
      });

      const buffer = Buffer.from(audioRes.data, 'binary');

      if (buffer.length === 0) throw new Error("El archivo de audio llegó vacío.");

      // 4. Enviar el audio
      await sock.sendMessage(from, {
        audio: buffer,
        fileName: `${title}.mp3`,
        mimetype: "audio/mpeg"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en play (play-dl):", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ Error al procesar la música.\n_${e.message}_`);
    }
  }
};
