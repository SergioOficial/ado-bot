import yts from 'yt-search';
import axios from 'axios';
import sharp from 'sharp';

export default {
  command: ['ytsearch', 'search'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    if (!args[0]) return enviartexto('《✧》 Por favor, Ingrese el título de un vídeo.');

    try {
      const ress = await yts(args.join(' '));
      const armar = ress.all.slice(0, 5);
      
      const imgRes = await axios.get(armar[0].image, { responseType: 'arraybuffer' });
      const Ibuff = await sharp(Buffer.from(imgRes.data)).resize({ width: 600 }).jpeg({ quality: 80 }).toBuffer();

      let teks2 = armar.map((v) => {
        if (v.type === 'video') {
          return `➩ *Título ›* *${v.title}* \n\n> ⴵ *Duración ›* ${v.timestamp}\n> ❖ *Subido ›* ${v.ago}\n> ✿ *Vistas ›* ${v.views}\n> ❒ *Url ›* ${v.url}`.trim();
        }
        return null;
      }).filter(Boolean).join('\n\n╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ┈┄۪ ─ׄ〬╼\n\n');

      await sock.sendMessage(from, { image: Ibuff, caption: teks2 }, { quoted: m });
    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};