export default {
  command: ["meme", "memes"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    
    await sock.sendMessage(from, { react: { text: "😂", key: m.key } });

    try {
      const res = await fetch("https://meme-api.com/gimme");
      const data = await res.json();
      
      await sock.sendMessage(from, {
        image: { url: data.url },
        caption: `😂 *${data.title}*\n\n> ⬆️ Upvotes: ${data.ups}\n> 📂 Subreddit: r/${data.subreddit}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await enviartexto("❌ No se pudo obtener un meme en este momento.");
    }
  }
};
