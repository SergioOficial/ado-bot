import axios from "axios";
import sharp from "sharp";

export default {
  command: ["meme", "memes"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "😂", key: m.key } });

    const apis = [
      { url: "https://meme-api.com/gimme/memes", extract: (d) => ({ url: d.url, title: d.title, ups: d.ups, sub: d.subreddit }) },
      { url: "https://meme-api.com/gimme/dankmemes", extract: (d) => ({ url: d.url, title: d.title, ups: d.ups, sub: d.subreddit }) },
      { url: "https://api.imgflip.com/get_memes", extract: (d) => {
          const m = d.data.memes[Math.floor(Math.random() * d.data.memes.length)];
          return { url: m.url, title: m.name, ups: 0, sub: "Imgflip" };
      }}
    ];

    try {
      let meme = null;
      for (const api of apis) {
        try {
          const res = await axios.get(api.url, { timeout: 8000 });
          const data = api.extract(res.data);
          if (data && data.url && data.url.startsWith("http")) { meme = data; break; }
        } catch (e) { console.log("API de meme falló, intentando siguiente..."); }
      }

      if (!meme) throw new Error("Todas las APIs de memes fallaron.");

      const imgRes = await axios.get(meme.url, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = await sharp(Buffer.from(imgRes.data))
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      await sock.sendMessage(from, { 
        image: buffer, 
        caption: `😂 *${meme.title}*\n\n> ⬆️ Upvotes: ${meme.ups}\n> 📂 r/${meme.sub}` 
      }, { quoted: m });
      
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en meme:", e.message);
      await enviartexto(`❌ Error: ${e.message}`);
    }
  }
};
