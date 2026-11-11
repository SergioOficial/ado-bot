import yts from 'yt-search';
import axios from 'axios';

export default {
  command: ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'],
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

      const apis = [
        `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`
      ];

      let videoBuffer = null;

      for (const api of apis) {
        try {
          const res = await axios.get(api, { timeout: 15000 });
          const dlUrl = res.data?.data?.url || res.data?.data?.dl || res.data?.result?.url;
          if (dlUrl) {
            const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 45000 });
            videoBuffer = Buffer.from(videoRes.data, 'binary');
            break;
          }
        } catch (e) { console.log('API fallida:', e.message); }
      }

      if (!videoBuffer) throw new Error('Todas las APIs de descarga fallaron.');

      await sock.sendMessage(from, { text: `✅ *Video encontrado.*\n_Enviando video..._`, edit: waitMsg.key }).catch(() => {});

      await sock.sendMessage(from, {
        video: videoBuffer,
        fileName: `${videoInfo.title}.mp4`,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: waitMsg.key }).catch(() => {});
    }
  }
};