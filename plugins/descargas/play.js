import yts from 'yt-search';
import axios from 'axios';

export default {
  command: ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;

    if (!args[0]) return enviartexto('《✧》Por favor, menciona el nombre o URL del video que deseas descargar');

    const text = args.join(' ');
    const waitMsg = await sock.sendMessage(from, { text: `🔍 *Buscando:* "${text}"...` }, { quoted: m });

    try {
      const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
      const query = videoMatch ? 'https://youtu.be/' + videoMatch[1] : text;
      
      const search = await yts(query);
      if (!search.all.length) throw new Error('No se encontraron resultados.');
      
      const videoInfo = videoMatch ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0] : search.all[0];
      const url = videoInfo.url;
      const title = videoInfo.title;

      
      const apis = [
        `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
        `https://natsu-api.darkcore.xyz/api/ytmp3?url=${encodeURIComponent(url)}&apikey=${process.env.NATSU_API_KEY || ''}`
      ];

      let audioBuffer = null;
      let usedApi = null;

      for (const api of apis) {
        try {
          const res = await axios.get(api, { timeout: 15000 });
          const dlUrl = res.data?.data?.url || res.data?.download?.url || res.data?.data?.dl || res.data?.result?.download;
          if (dlUrl) {
            const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 30000 });
            audioBuffer = Buffer.from(audioRes.data, 'binary');
            usedApi = api;
            break;
          }
        } catch (e) { console.log('API fallida:', e.message); }
      }

      if (!audioBuffer) throw new Error('Todas las APIs de descarga fallaron.');

      const captionEdit = `✅ *Encontrada:*\n\n> ❖ Canal › *${videoInfo.author?.name || 'Desconocido'}*\n> ⴵ Duración › *${videoInfo.timestamp}*\n> ❒ Enlace › *${url}*\n\n_Enviando audio..._`;

      await sock.sendMessage(from, { text: captionEdit, edit: waitMsg.key }).catch(() => {});

      await sock.sendMessage(from, {
        audio: audioBuffer,
        fileName: `${title}.mp3`,
        mimetype: 'audio/mpeg'
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: waitMsg.key }).catch(() => {});
    }
  }
};