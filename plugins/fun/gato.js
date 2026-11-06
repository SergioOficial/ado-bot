import axios from "axios";
import sharp from "sharp";

export default {
  command: ["gato", "cat", "meow"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "🐱", key: m.key } });

    const apis = [
      { url: "https://api.thecatapi.com/v1/images/search", extract: (d) => d[0]?.url },
      { url: "https://cataas.com/cat?json=true", extract: (d) => d.url ? (d.url.startsWith('http') ? d.url : `https://cataas.com${d.url}`) : null },
      { url: "https://api.thecatapi.com/v1/images/search?limit=1", extract: (d) => d[0]?.url }
    ];

    try {
      let imgUrl = null;
      for (const api of apis) {
        try {
          const res = await axios.get(api.url, { timeout: 8000 });
          const url = api.extract(res.data);
          if (url && url.startsWith("http")) { imgUrl = url; break; }
        } catch (e) { console.log("API de gato falló, intentando siguiente..."); }
      }

      if (!imgUrl) throw new Error("Todas las APIs de gatos fallaron.");

      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = await sharp(Buffer.from(imgRes.data))
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      await sock.sendMessage(from, { image: buffer, caption: `🐱 *¡Miau!*` }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en gato:", e.message);
      await enviartexto(`❌ Error: ${e.message}`);
    }
  }
};
