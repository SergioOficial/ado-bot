import axios from "axios";

export default {
  command: ["nsfw", "nsfwimagen"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;

    await sock.sendMessage(from, { react: { text: "😰", key: m.key } });

    try {
      // 1) Petición a la API (usando axios, respetando POST + JSON)
      const { data } = await axios.post(
        "https://api.stellarwa.xyz/nsfw/image?cat=Waifu&key=api-uJijf",
        {},
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );

      // 2) Extraer la URL de forma tolerante a la forma de la respuesta
      const images = data?.data?.images ?? data?.images ?? [];
      const imageUrl = images[0]?.url;
      if (!imageUrl) throw new Error("La API no devolvió ninguna imagen.");

      // 3) Descargar la imagen como Buffer correctamente
      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      const buffer = Buffer.from(imgRes.data); // ya es ArrayBuffer/Buffer válido

      // 4) Enviar al chat
      await sock.sendMessage(
        from,
        {
          image: buffer,
          caption: `🚔 *NSFW Waifu*\n\n> _Imagen obtenida_\n${config.footer}`,
        },
        { quoted: m }
      );

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en #NSFW:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ No se pudo obtener la imagen.\n_${e.message}_`);
    }
  },
};