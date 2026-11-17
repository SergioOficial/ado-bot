import axios from "axios";
import sharp from "sharp";

export default {
  command: ["nsfwimge", "waifusfw"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "😰", key: m.key } });

    const apis = [
      {
        url: "https://api.waifu.pics/nsfw/waifu",
        extract: (d) => ({ url: d.url, fuente: "waifu.pics" })
      },
      {
        url: "https://api.waifu.im/search?included_tags=waifu&is_nsfw=true",
        extract: (d) => ({ url: d.images[0].url, fuente: "waifu.im" })
      },
      {
        url: "https://api.stellarwa.xyz/nsfw/image?key=api-uJijf",
       extract: (d) => ({ url: d.url, fuente;
"stellarwa.xyz" })
       },
      {
        url: "https://nekos.life/api/nsfw/nsfw",
        extract: (d) => ({ url: d.url, fuente: "nekos.life" })
      }
    ];

    try {
      let imagen = null;
      for (const api of apis) {
        try {
          const res = await axios.get(api.url, { timeout: 8000 });
          const data = api.extract(res.data);
          if (data && data.url && data.url.startsWith("http")) {
            imagen = data;
            break;
          }
        } catch (e) {
          console.log(`API ${new URL(api.url).hostname} falló, intentando siguiente...`);
        }
      }

      if (!imagen) throw new Error("Todas las APIs NSFW fallaron.");

      // 📥 Descarga + optimización con sharp
      const imgRes = await axios.get(imagen.url, {
        responseType: "arraybuffer",
        timeout: 15000
      });
      const buffer = await sharp(Buffer.from(imgRes.data))
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      await sock.sendMessage(
        from,
        {
          image: buffer,
          caption: `🚔 *NSFW Waifu*\n\n> 🖼️ Fuente: ${imagen.fuente}\n> 🔒 Contenido no seguro`
        },
        { quoted: m }
      );

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en sfw:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ Error: ${e.message}`);
    }
  }
};