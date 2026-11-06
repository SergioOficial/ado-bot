import axios from "axios";

export default {
  command: ["meme", "memes"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "😂", key: m.key } });

    try {
      let memeData = null;
      
      // Intentar buscar hasta 3 veces para asegurar que no salga NSFW
      for (let i = 0; i < 3; i++) {
        const res = await axios.get("https://meme-api.com/gimme/memes", { timeout: 10000 });
        if (!res.data.nsfw && res.data.url) {
          memeData = res.data;
          break;
        }
      }

      if (!memeData) throw new Error("No se encontraron memes seguros.");

      const imgRes = await axios.get(memeData.url, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(imgRes.data);
      
      if (buffer.length === 0) throw new Error("La imagen llegó vacía.");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `😂 *${memeData.title}*\n\n> ⬆️ Upvotes: ${memeData.ups}\n> 📂 Subreddit: r/${memeData.subreddit}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en meme:", e.message);
      await enviartexto(`❌ No se pudo obtener un meme: ${e.message}`);
    }
  }
};
