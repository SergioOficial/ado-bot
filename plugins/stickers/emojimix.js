import { Sticker } from "wa-sticker-formatter";
import axios from "axios";

export default {
  command: ["emojimix", "mix"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;

    if (!args[0]) {
      return enviartexto(`《✧》 Ingresa 2 emojis para combinar.\n> Ejemplo: ${config.prefix[0]}emojimix 👻+👀`);
    }

    const text = args.join(" ");
    const [emoji1, emoji2] = text.split("+");

    if (!emoji1 || !emoji2) {
      return enviartexto("❌ Formato incorrecto. Debes separar los emojis con un `+` (ej: 😎+🔥)");
    }

    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

    const apiKey = "api-eR9cS";
    const baseUrl = "https://api.stellarwa.xyz/tools/emojimix";

    // Estrategias de petición (la API puede esperar los emojis de diferentes formas)
    const estrategias = [
      // 1. Parámetros separados: ?emoji1=...&emoji2=...
      `${baseUrl}?key=${apiKey}&emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`,
      // 2. Parámetro único: ?text=emoji1+emoji2
      `${baseUrl}?key=${apiKey}&text=${encodeURIComponent(emoji1 + "+" + emoji2)}`,
      // 3. Parámetro único: ?q=emoji1+emoji2
      `${baseUrl}?key=${apiKey}&q=${encodeURIComponent(emoji1 + "+" + emoji2)}`
    ];

    let stickerBuffer = null;

    for (const url of estrategias) {
      try {
        const res = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 15000
        });

        const buffer = Buffer.from(res.data);

        // Si la respuesta es un JSON (empieza con '{'), extraemos la URL de la imagen
        if (buffer.toString("utf8", 0, 1) === "{") {
          const data = JSON.parse(buffer.toString());
          const imgUrl = data.url || data.result?.url || data.image || data.result?.image;
          if (imgUrl) {
            const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer" });
            stickerBuffer = Buffer.from(imgRes.data);
            break; // Éxito
          }
        } else {
          // Si es un buffer de imagen directamente, lo usamos
          stickerBuffer = buffer;
          break; // Éxito
        }
      } catch (e) {
        // Si esta estrategia falla, probamos la siguiente
        console.log(`Estrategia fallida: ${url.split('?')[1]}`, e.message);
      }
    }

    if (!stickerBuffer) {
      await sock.sendMessage(from, { react: { text: "✖️", key: m.key } });
      return enviartexto("❌ No se pudo generar el sticker. Verifica que la API esté funcionando y que los emojis sean válidos.");
    }

    try {
      const sticker = new Sticker(stickerBuffer, {
        pack: config.botName || "Ado-Bot",
        author: config.ownerName || "Sergio Dev",
        type: "full",
        quality: 80
      });

      await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✔️", key: m.key } });
    } catch (e) {
      console.error("Error al crear el sticker:", e.message);
      await sock.sendMessage(from, { react: { text: "✖️", key: m.key } });
      await enviartexto(`❌ Error al crear el sticker: ${e.message}`);
    }
  }
};