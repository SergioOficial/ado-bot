import axios from "axios";

export default {
  command: ["nsfw", "waifunsfw"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;

    await sock.sendMessage(from, { react: { text: "😰", key: m.key } });

    try {
      const res = await fetch("https://api.stellarwa.xyz/nsfw/image?cat=Waifu&key=api-uJijf", {
  method: "POST",
  headers: {
  "Content-Type": "application/json"
}
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
      const imageUrl = res.data.images[0]?.url;
      if (!imageUrl) throw new Error("La API no devolvió ninguna imagen.");

      // 📥 Descargamos la imagen como Buffer para evitar el error de subida
      const imgRes = await fetch(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
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