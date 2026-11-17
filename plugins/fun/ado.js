import axios from "axios";

export default {
  command: ["nsfw", "imagensfw"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;
    await sock.sendMessage(from, { react: { text: "😰", key: m.key } });

    try {
      // 1️⃣ Petición con parámetros en el BODY (por si la API los exige así)
      const { data } = await axios.post(
        "https://api.stellarwa.xyz/nsfw/image",
        { cat: "waifu", key: "api-uJijf" }, // 👈 minúsculas
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );

      // 2️⃣ Extraer la URL (soporta varias formas de respuesta)
      const images = data?.data?.images ?? data?.images ?? [];
      const imageUrl = images[0]?.url;
      if (!imageUrl) throw new Error("La API no devolvió ninguna imagen.");

      // 3️⃣ Descargar como Buffer
      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      const buffer = Buffer.from(imgRes.data);

      // 4️⃣ Enviar
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
      // 🔍 Si el error es de la API, muestra el status y el mensaje exacto
      if (e.response) {
        console.error("Error de la API:", e.response.status, e.response.data);
        await enviartexto(
          `❌ La API respondió con ${e.response.status}.\n_${
            e.response.data?.message || "Parámetros inválidos"
          }_`
        );
      } else {
        console.error("Error en #NSFW:", e.message);
        await enviartexto(`❌ No se pudo obtener la imagen.\n_${e.message}_`);
      }
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    }
  },
};