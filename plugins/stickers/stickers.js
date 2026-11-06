import * as cheerio from "cheerio";
import { Sticker } from "wa-sticker-formatter";
export default {
  command: ["stickers", "searchsticker"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const raw = args.join(' ').trim();
    if (!raw) return enviartexto('《✧》 Ingresa el nombre de los stickers.');
    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
    try {
      const searchRes = await fetch(`https://getstickerpack.com/stickers?query=${encodeURIComponent(raw)}`);
      const $ = cheerio.load(await searchRes.text());
      const packs = [];
      $('.sticker-pack-cols a').each((_, el) => { const title = $(el).find('.title').text().trim(), href = $(el).attr('href'); if (title && href) packs.push({ title, url: href.startsWith('http') ? href : 'https://getstickerpack.com' + href }); });
      if (!packs.length) return enviartexto('❌ No hay resultados.');
      const packUrl = packs[0].url;
      const $pack = cheerio.load(await (await fetch(packUrl)).text());
      const links = [];
      $pack('img.sticker-image').each((_, el) => { let src = $pack(el).attr('data-src-large') || $pack(el).attr('src'); if (src) links.push(src.startsWith('http') ? src : 'https://getstickerpack.com' + src); });
      for (let i = 0; i < Math.min(links.length, 5); i++) {
        const buffer = Buffer.from(await (await fetch(links[i], { headers: { Referer: 'https://getstickerpack.com' } })).arrayBuffer());
        const sticker = new Sticker(buffer, { pack: config.botName, author: config.ownerName, type: 'full', quality: 70 });
        await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
        await new Promise(r => setTimeout(r, 1000));
      }
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) { await enviartexto(`Error: ${e.message}`); }
  }
};
