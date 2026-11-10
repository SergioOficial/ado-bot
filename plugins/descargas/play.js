import axios from "axios";

const safeFileName = (name) => String(name || 'audio').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 50);
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

export default {
  command: ["play", "mp3", "ytmp3", "audio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    
    const query = args.join(' ').trim();
    if (!query) {
      return enviartexto(
        '🎵 *REPRODUCIR AUDIO*\n\n' +
        `🔗 Uso: ${config.prefix[0]}play <canción o enlace de YouTube>\n` +
        `✨ Ejemplo: ${config.prefix[0]}play Ven Mi Amor`
      );
    }

    // 📩 1. Enviamos el mensaje inicial de "Buscando"
    const waitMsg = await sock.sendMessage(from, { 
      text: `🔍 *Buscando:* "${query}"...` 
    }, { quoted: m });

    try {
      let youtubeUrl = query;
      let videoInfo = null;

      // Si no es una URL, buscamos en YouTube con yt-search
      if (!YT_REGEX.test(query)) {
        const { default: yts } = await import("yt-search");
        const search = await yts(query);
        
        if (!search.all || search.all.length === 0) {
          throw new Error("No se encontraron resultados en YouTube.");
        }
        
        videoInfo = search.all[0];
        youtubeUrl = videoInfo.url;
      }

      // 🔑 Obtener la API KEY de forma segura
      const NATSU_API_KEY = process.env.NATSU_API_KEY;
      if (!NATSU_API_KEY) {
        throw new Error("Falta configurar la variable de entorno NATSU_API_KEY.");
      }

      // 🌐 2. Petición a la API de Natsu
      const apiUrl = `https://natsu-api.darkcore.xyz/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}&apikey=${NATSU_API_KEY}`;
      
      const res = await axios.get(apiUrl, { timeout: 30000 });
      const data = res.data;

      // 🕵️‍♂️ Intentar extraer la URL del audio y metadatos según la estructura de Natsu
      // (Como no sé exactamente cómo devuelve los datos, probamos varias opciones comunes)
      const audioUrl = 
        data.download?.url || 
        data.data?.download?.url || 
        data.data?.url || 
        data.result?.download || 
        data.result?.url;

      if (!audioUrl) {
        throw new Error("La API no devolvió un enlace de descarga válido.");
      }

      // Metadatos (priorizando lo que devuelva la API o lo que encontramos en yt-search)
      const title = data.title || data.data?.title || videoInfo?.title || "Audio de YouTube";
      const author = data.author || data.data?.author || videoInfo?.author?.name || "YouTube";

      // 📥 3. Descargar el audio a la memoria (Buffer) para evitar fallos de WhatsApp
      const audioRes = await axios.get(audioUrl, { 
        responseType: 'arraybuffer',
        timeout: 60000 // 1 minuto de margen por si pesa mucho
      });
      
      const audioBuffer = Buffer.from(audioRes.data, 'binary');

      // 📝 4. Editamos el mensaje inicial para decir "Encontrada"
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

      // 🔊 5. Enviamos el audio
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        fileName: `${safeFileName(title)}.mp3`,
        ptt: false
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error("Error en #play (Natsu):", err.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      
      // Si falla, editamos el mensaje de "Buscando..."
      await sock.sendMessage(from, { 
        text: `❌ *ERROR DE DESCARGA*\n\n📛 No se pudo reproducir el audio.\n🔎 Detalle: ${err.message}`, 
        edit: waitMsg.key 
      }).catch(() => {
        enviartexto(`❌ Error: ${err.message}`);
      });
    }
  }
};