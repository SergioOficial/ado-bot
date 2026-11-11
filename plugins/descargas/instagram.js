import axios from 'axios';

export default {
  command: ['instagram', 'ig'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = args[0];

    if (!url) return enviartexto('《✧》 Por favor, ingrese un enlace de Instagram.');
    if (!url.match(/instagram\.com\/(p|reel|share|tv|stories)\//)) return enviartexto('《✧》 El enlace no parece *válido*.');

    try {
      const api = `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 15000 });
      const data = res.data.data;

      if (!data || !data.length) throw new Error('No se pudo obtener el contenido.');

      const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅘🅖 🅓ownload　ׄᰙ\n\n> ❒ Enlace › ${url}`;
      const media = data[0];

      const mediaRes = await axios.get(media.url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(mediaRes.data, 'binary');

      if (media.url.includes('.mp4')) {
        await sock.sendMessage(from, { video: buffer, caption, mimetype: 'video/mp4' }, { quoted: m });
      } else {
        await sock.sendMessage(from, { image: buffer, caption }, { quoted: m });
      }
    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};