import axios from 'axios';

export default {
  command: ['tiktok', 'tt'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = args[0];

    if (!url) return enviartexto('《✧》 Por favor, ingresa un enlace de TikTok.');
    if (!url.match(/tiktok\.com/)) return enviartexto('《✧》 El enlace no es válido.');

    try {
      const api = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 15000 });
      const data = res.data.data;

      if (!data || !data.video) throw new Error('No se pudo obtener el video.');

      const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ\n\n> ✎ Título: ${data.title || 'Sin título'}\n> ❖ Autor: ${data.author || 'Desconocido'}`;

      const vidRes = await axios.get(data.video, { responseType: 'arraybuffer' });
      await sock.sendMessage(from, { video: Buffer.from(vidRes.data, 'binary'), caption, mimetype: 'video/mp4' }, { quoted: m });

      if (data.audio) {
        const audRes = await axios.get(data.audio, { responseType: 'arraybuffer' });
        await sock.sendMessage(from, { audio: Buffer.from(audRes.data, 'binary'), mimetype: 'audio/mp4', fileName: 'tiktok_audio.mp4' }, { quoted: m });
      }
    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};