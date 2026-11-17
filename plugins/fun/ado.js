import axios from "axios";

export default {
  command: ["nsfw", "waifunsfw"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;

    await sock.sendMessage(from, { react: { text: "😰", key: m.key } });

    try {
      const res = await axios.get("https://api.stellarwa.xyz/nsfw/image?key=api-uJijf", {
        params: { included_tags: "waifu", is_nsfw: true },
        timeout: 10000
      });

      const imageUrl = res.data.images[0]?.url;
      if (!imageUrl) throw new Error("La API no devolvió ninguna imagen.");

      // 📥 Descargamos la imagen como Buffer para evitar el error de subida
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
      const buffer = Buffer.from(imgRes.data, "binary");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🚔 *NSFW Waifu*\n\n> _Imagen obtenida_\n${config.footer}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en #NSFW:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ No se pudo obtener la imagen.\n_${e.message}_`);
    }
  }
};