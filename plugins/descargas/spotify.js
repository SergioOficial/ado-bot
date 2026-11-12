import axios from "axios";

export default {
  command: ["spotify", "sp", "spt"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const url = args[0];

    if (!url) {
      return enviartexto(`🎵 *SPOTIFY DOWNLOADER*\n\nUso: ${config.prefix[0]}sp <enlace de Spotify>\nEjemplo: ${config.prefix[0]}sp https://open.spotify.com/track/...`);
    }

    if (!url.match(/open\.spotify\.com|spoti\.fi/i)) {
      return enviartexto("⚠️ El enlace no parece ser de Spotify. Verifica que sea correcto.");
    }

    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `🔍 *Buscando en Spotify...*` }, { quoted: m });

    try {
      const apiKey = process.env.NATSU_API_KEY || "";
      const apiUrl = `https://natsu-api.darkcore.xyz/api/spotify?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
      
      const res = await axios.get(apiUrl, { timeout: 20000 });
      const data = res.data;

      // 🕵️‍♂️ Extracción robusta de datos
      const audioUrl = data.data?.url || data.data?.download || data.result?.url || data.url || data.download;
      
      if (!audioUrl) {
        throw new Error("La API no devolvió un enlace de descarga válido.");
      }

      const title = data.data?.title || data.result?.title || data.title || "Canción de Spotify";
      const artist = data.data?.artist || data.result?.artist || data.artist || "Desconocido";
      const thumbnail = data.data?.thumbnail || data.result?.thumbnail || data.thumbnail || data.cover;

      // 📥 Descargar el audio como Buffer
      const audioRes = await axios.get(audioUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000 
      });
      const audioBuffer = Buffer.from(audioRes.data);

      // 📝 Editar el mensaje con los datos de la canción
      const caption = `
✅ *Encontrada:*

🎵 *Título:* ${title}
👤 *Artista:* ${artist}
🎧 *Formato:* MP3

> _Enviando audio..._
${config.footer}
`.trim();

      await sock.sendMessage(from, { text: caption, edit: waitMsg.key }).catch(() => {});

      // 🖼️ Enviar miniatura si está disponible
      if (thumbnail) {
        await sock.sendMessage(from, { 
          image: { url: thumbnail }, 
          caption: `🎵 *${title}* - ${artist}` 
        }, { quoted: m }).catch(() => {});
      }

      // 🔊 Enviar el audio
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en Spotify:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      
      await sock.sendMessage(from, { 
        text: `❌ *Error al descargar de Spotify.*\n🔎 Detalle: _${e.message}_`, 
        edit: waitMsg.key 
      }).catch(() => {
        enviartexto(`❌ Error: ${e.message}`);
      });
    }
  }
};