import axios from "axios";

export default {
  command: ["meme", "memes"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    
    await sock.sendMessage(from, { react: { text: "😂", key: m.key } });

    try {
      let memeData = null;
      let intentos = 0;

      // 1. Buscar un meme seguro
      while (intentos < 3 && !memeData) {
        try {
          const res = await axios.get("https://meme-api.com/gimme/memes", { timeout: 15000 });
          if (!res.data.nsfw && res.data.url) {
            memeData = res.data;
            break;
          }
        } catch (e) {
          console.log(`Intento ${intentos + 1} fallido:`, e.message);
        }
        intentos++;
      }

      if (!memeData) throw new Error("No se encontraron memes.");

      // 2. Descargar la imagen con axios (como arraybuffer)
      const imgRes = await axios.get(memeData.url, { 
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buffer = Buffer.from(imgRes.data, 'binary');

      // 3. Verificar que la imagen no sea muy pesada (máximo 5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        throw new Error("La imagen del meme es demasiado grande (más de 5MB).");
      }

      // 4. Enviar
      await sock.sendMessage(from, {
        image: buffer,
        caption: `😂 *${memeData.title}*\n\n> ⬆️ Upvotes: ${memeData.ups}\n> 📂 Subreddit: r/${memeData.subreddit}\n> 🔗 [Ver original](${memeData.postLink})`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en meme:", e.message);
      await enviartexto(`❌ No se pudo obtener un meme.\n_${e.message}_`);
    }
  }
};
