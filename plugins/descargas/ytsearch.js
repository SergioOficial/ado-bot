export default {
  command: ["ytsearch", "search"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const query = args.join(" ").trim();
    if (!query) return enviartexto("《✧》 Ingresa el título de un vídeo.");
    try {
      await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
      const { default: yts } = await import("yt-search");
      const ress = await yts(query);
      if (!ress.all || ress.all.length === 0) return enviartexto("❌ No hay resultados.");
      const armar = ress.all.slice(0, 5), first = armar[0];
      let teks2 = armar.map(v => v.type === 'video' ? `➩ *Título ›* *${v.title}* \n\n> ⴵ *Dur ›* ${v.timestamp}\n> ❖ *Subido ›* ${v.ago}\n> ✿ *Vistas ›* ${v.views}\n> ❒ *Url ›* ${v.url}` : null).filter(v => v).join('\n\n╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ┈┄۪ ─ׄ〬╼\n\n');
      await sock.sendMessage(from, { text: teks2, contextInfo: { externalAdReply: { title: first.title || 'YouTube', body: `Canal: ${first.author?.name}`, thumbnailUrl: first.image, sourceUrl: first.url, mediaType: 1, renderLargerThumbnail: true } } }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) { await enviartexto(`❌ Error.`); }
  }
};
