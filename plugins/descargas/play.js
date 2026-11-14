import axios from "axios";
import yts from "yt-search";

const safeFileName = (name) => String(name || "audio").replace(/[/\\?%*:|"<>]/g, "-").slice(0, 50);
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ").trim();

    if (!query) {
      return enviartexto(`《✧》Menciona el nombre o URL del video que deseas descargar.\nEjemplo: ${config.prefix[0]}play faded alan walker`);
    }

    // 📩 1. Mensaje inicial de "Buscando"
    const waitMsg = await sock.sendMessage(from, { 
      text: `🔍 *Buscando:* "${query}"...` 
    }, { quoted: m });

    try {
      let youtubeUrl = query;
      let videoInfo = null;

      // Si no es una URL, buscamos en YouTube
      if (!YT_REGEX.test(query)) {
        const search = await yts(query);
        if (!search.all || search.all.length === 0) {
          throw new Error("No se encontraron resultados en YouTube.");
        }
        videoInfo = search.all[0];
        youtubeUrl = videoInfo.url;
      }

      // 🌐 2. Petición a tu API de StellarWA
      const apiUrl = `https://api.stellarwa.xyz/dl/ytmp3?key=api-uJijf&url=${encodeURIComponent(youtubeUrl)}`;
      
      const res = await axios.get(apiUrl, { timeout: 25000 });
      const data = res.data;

      // 🕵️‍♂️ Extracción robusta del enlace (por si la API cambia la estructura)
      const audioUrl = 
        data?.result?.url || 
        data?.result?.download || 
        data?.url || 
        data?.download || 
        data?.data?.url;

      if (!audioUrl) {
        throw new Error("La API no devolvió un enlace de descarga válido.");
      }

      // Metadatos (priorizando lo que devuelve la API o lo que encontramos en yt-search)
      const title = data?.result?.title || data?.title || videoInfo?.title || "Audio de YouTube";
      const author = data?.result?.author || data?.author || videoInfo?.author?.name || "YouTube";

      // 📥 3. Descargar el audio a memoria (Buffer)
      const audioRes = await axios.get(audioUrl, { 
        responseType: "arraybuffer", 
        timeout: 45000 // Damos tiempo extra para audios pesados
      });
      const audioBuffer = Buffer.from(audioRes.data);

      // 📝 4. Editar el mensaje para decir "Encontrada"
      const captionEdit = 
        `✅ *Encontrada:*\n\n` +
        `⊱ ──── {.⋅ ♫ ⋅.} ──── ⊰\n` +
        `✦ *ɴᴏᴍʙʀᴇ:* ${title}\n` +
        `❐ *ғᴏʀᴍᴀᴛᴏ:* MP3\n` +
        `✎ *ᴄᴀɴᴀʟ:* ${author}\n` +
        `✧ *ᴜʀʟ:* ${youtubeUrl}\n` +
        `\n> _Enviando audio..._`;

      await sock.sendMessage(from, { 
        text: captionEdit, 
        edit: waitMsg.key 
      }).catch(() => {});

      // 🔊 5. Enviar el audio
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        fileName: `${safeFileName(title)}.mp3`,
        ptt: false
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error("Error en #play (StellarWA):", err.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      
      // Si falla, editamos el mensaje con el error
      await sock.sendMessage(from, { 
        text: `❌ *ERROR DE DESCARGA*\n\n📛 No se pudo reproducir el audio.\n🔎 Detalle: ${err.message}`, 
        edit: waitMsg.key 
      }).catch(() => {
        enviartexto(`❌ Error: ${err.message}`);
      });
    }
  }
};