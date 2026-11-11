import axios from 'axios';

export default {
  command: ['fb', 'facebook'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = args[0];

    if (!url) return enviartexto('《✧》 Por favor, Ingrese un enlace de Facebook.');
    if (!url.match(/facebook\.com|fb\.watch|video\.fb\.com/)) return enviartexto('《✧》 El enlace es invalido, envía un link de Facebook válido');

    try {
      const api = `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 15000 });
      const data = res.data.data;

      if (!data || (!data.video && !data.image)) throw new Error('No se pudo obtener el contenido.');

      const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅕🅐🅒🅔🅑🅞🅞🅚 🅓ownload　ׄᰙ\n\n> ❒ Enlace › ${url}`;

      if (data.video) {
        const vidRes = await axios.get(data.video, { responseType: 'arraybuffer' });
        await sock.sendMessage(from, { video: Buffer.from(vidRes.data, 'binary'), caption, mimetype: 'video/mp4' }, { quoted: m });
      } else {
        const imgRes = await axios.get(data.image, { responseType: 'arraybuffer' });
        await sock.sendMessage(from, { image: Buffer.from(imgRes.data, 'binary'), caption }, { quoted: m });
      }
    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};