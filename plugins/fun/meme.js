export default {
  command: ["meme", "memes"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "😂", key: m.key } });

    try {
      const res = await fetch("https://meme-api.com/gimme/memes");
      const data = await res.json();
      
      if (!data || !data.url) throw new Error("La API de memes no devolvió una URL válida.");

      const imgRes = await fetch(data.url);
      if (!imgRes.ok) throw new Error("Error al descargar la imagen del meme.");
      
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length === 0) throw new Error("La imagen del meme llegó vacía.");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `😂 *${data.title}*\n\n> ⬆️ Upvotes: ${data.ups}\n> 📂 Subreddit: r/${data.subreddit}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en comando meme:", e.message);
      await enviartexto(`❌ No se pudo obtener un meme: ${e.message}`);
    }
  }
};
