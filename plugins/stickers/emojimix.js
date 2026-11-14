import { Sticker } from "wa-sticker-formatter";

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

    try {
      // 1. Buscar la combinación en Tenor (Emoji Kitchen)
      const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
      
      const res = await fetch(url);
      const json = await res.json();

      if (!json.results || json.results.length === 0) {
        throw new Error("No se encontraron stickers para esa combinación de emojis.");
      }

      const pack = config.botName || "Ado-Bot";
      const author = config.ownerName || "Sergio Dev";

      // 2. Enviar hasta los primeros 3 resultados (para no saturar el chat)
      const maxResults = Math.min(json.results.length, 3);

      for (let i = 0; i < maxResults; i++) {
        const result = json.results[i];
        
        // Descargar la imagen PNG
        const imgRes = await fetch(result.url);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Convertir a sticker WebP
        const sticker = new Sticker(buffer, {
          pack,
          author,
          type: "full",
          quality: 80
        });

        const stickerBuffer = await sticker.toBuffer();

        // Enviar sticker
        await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });
        
        // Pequeña pausa entre envíos
        await new Promise(r => setTimeout(r, 800));
      }

      await sock.sendMessage(from, { react: { text: "✔️", key: m.key } });

    } catch (e) {
      console.error("Error en #emojimix:", e.message);
      await sock.sendMessage(from, { react: { text: "✖️", key: m.key } });
      await enviartexto(`❌ Error al mezclar emojis:\n_${e.message}_`);
    }
  }
};