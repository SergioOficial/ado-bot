import axios from "axios";

export default {
  command: ["waifu", "anime", "neko"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, comando } = ctx;
    await sock.sendMessage(from, { react: { text: "🌸", key: m.key } });

    try {
      const tipo = comando === "neko" ? "neko" : "waifu";
      let imgUrl = null;

      // 🌐 Intentar API 1 (Nekos.best)
      try {
        const res = await axios.get(`https://nekos.best/api/v2/${tipo}`, { timeout: 8000 });
        imgUrl = res.data.results[0].url;
      } catch (err) {
        console.log("Nekos.best falló, intentando Waifu.im...");
      }

      // 🌐 Intentar API 2 (Waifu.im) si la primera falla
      if (!imgUrl) {
        const tag = tipo === "neko" ? "maid" : "waifu"; // Waifu.im usa tags, no "neko" directo
        const res = await axios.get(`https://api.waifu.im/search?included_tags=${tag}&is_nsfw=false`, { timeout: 8000 });
        imgUrl = res.data.images[0].url;
      }

      if (!imgUrl) throw new Error("No se pudo obtener ninguna imagen de las APIs.");

      // 📥 Descargar imagen en buffer
      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(imgRes.data);

      if (buffer.length === 0) throw new Error("La imagen llegó vacía.");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🌸 *${tipo.charAt(0).toUpperCase() + tipo.slice(1)} aleatorio (SFW)*`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en anime:", e.message);
      await enviartexto(`❌ Error al obtener la imagen: ${e.message}`);
    }
  }
};
