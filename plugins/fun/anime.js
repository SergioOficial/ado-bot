import axios from "axios";
import sharp from "sharp";

export default {
  command: ["waifu", "anime", "neko"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, comando } = ctx;
    await sock.sendMessage(from, { react: { text: "🌸", key: m.key } });

    const tipo = comando === "neko" ? "neko" : "waifu";
    const apis = [
      { url: `https://nekos.best/api/v2/${tipo}`, extract: (d) => d.results[0]?.url },
      { url: `https://api.waifu.im/search?included_tags=${tipo}&is_nsfw=false`, extract: (d) => d.images[0]?.url },
      { url: `https://api.nekosia.cat/api/v1/images/${tipo}`, extract: (d) => d.image?.original?.url }
    ];

    try {
      let imgUrl = null;
      for (const api of apis) {
        try {
          const res = await axios.get(api.url, { timeout: 8000 });
          const url = api.extract(res.data);
          if (url && url.startsWith("http")) { imgUrl = url; break; }
        } catch (e) { console.log("API de anime falló, intentando siguiente..."); }
      }

      if (!imgUrl) throw new Error("Todas las APIs de anime fallaron.");

      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = await sharp(Buffer.from(imgRes.data))
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      await sock.sendMessage(from, { image: buffer, caption: `🌸 *${tipo.toUpperCase()} SFW*` }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en anime:", e.message);
      await enviartexto(`❌ Error: ${e.message}`);
    }
  }
};
