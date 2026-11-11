import axios from 'axios';
import path from 'path';
import { lookup } from 'mime-types';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export default {
  command: ['mediafire', 'mf'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = args[0];

    if (!url || !url.includes('mediafire.com')) return enviartexto('《✧》 Por favor, ingresa un enlace válido de Mediafire.');

    try {
      const res = await axios.get(url, { headers: { 'User-Agent': UA } });
      const $ = cheerio.load(res.data);

      const downloadLink = $('#downloadButton').attr('href');
      if (!downloadLink) throw new Error('Enlace de descarga no encontrado.');

      const filename = $('.intro .filename').text().trim() || 'archivo.zip';
      const ext = path.extname(filename);
      const tipo = lookup(ext) || 'application/octet-stream';

      const info = `✰ ᩧ　𓈒　ׄ　𝖬𝖾𝖽𝗂𝖺𝖥𝗂𝗋𝖾　ׅ　✿\n\nׄ ﹙ׅ✿﹚ּ *Nombre* › ${filename}\nׄ ﹙ׅ✿﹚ּ *Tipo* › ${tipo}`;

      await sock.sendMessage(from, { text: info }, { quoted: m });
      await sock.sendMessage(from, { document: { url: downloadLink }, mimetype: tipo, fileName: filename }, { quoted: m });

    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};