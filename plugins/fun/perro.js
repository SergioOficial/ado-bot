import axios from "axios";
import sharp from "sharp";

export default {
  command: ["perro", "dog"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "🐶", key: m.key } });

    const apis = [
      { url: "https://dog.ceo/api/breeds/image/random", extract: (d) => d.message },
      { url: "https://random.dog/woof.json", extract: (d) => d.url }
    ];

    try {
      let imgUrl = null;
      for (const api of apis) {
        try {
          const res = await axios.get(api.url, { timeout: 8000 });
          const url = api.extract(res.data);
          if (url && url.startsWith("http")) { imgUrl = url; break; }
        } catch (e) { console.log("API de perro falló, intentando siguiente..."); }
      }

      if (!imgUrl) throw new Error("Todas las APIs de perros fallaron.");

      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = await sharp(Buffer.from(imgRes.data))
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      await sock.sendMessage(from, { image: buffer, caption: `🐶 *¡Guau!*` }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en perro:", e.message);
      await enviartexto(`❌ Error: ${e.message}`);
    }
  }
};
