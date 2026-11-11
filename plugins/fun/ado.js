import axios from "axios";

export default {
  command: ["ado", "waifuado"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;

    await sock.sendMessage(from, { react: { text: "🎤", key: m.key } });

    try {
      // 🌐 Usamos la API de Waifu.im (gratuita y sin clave)
      // Nota: No hay un tag "ado" oficial, así que traerá una waifu aleatoria.
      const res = await axios.get("https://api.waifu.im/search", {
        params: { included_tags: "waifu", is_nsfw: false },
        timeout: 10000
      });

      const imageUrl = res.data.images[0]?.url;
      if (!imageUrl) throw new Error("La API no devolvió ninguna imagen.");

      // 📥 Descargamos la imagen como Buffer para evitar el error de subida
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
      const buffer = Buffer.from(imgRes.data, "binary");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🎤 *Ado Waifu*\n\n> _Imagen obtenida de Waifu.im_\n${config.footer}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en #ado:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ No se pudo obtener la imagen.\n_${e.message}_`);
    }
  }
};