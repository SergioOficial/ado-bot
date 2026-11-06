export default {
  command: ["pinterest", "pin"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const rawArgs = args.join(" ").trim();
    if (!rawArgs) return enviartexto(`❌ Uso: ${config.prefix}pinterest <búsqueda> [cantidad]`);
    const match = rawArgs.match(/(.*?)(?:\s+(\d+))?$/);
    const query = match[1].trim(), limit = parseInt(match[2]) || 5, maxImages = Math.min(limit, 10);
    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `🔍 Buscando *${maxImages}* imágenes de: *${query}*...` }, { quoted: m });
    const apis = [`https://pinscrapper.vercel.app/api/search?q=${encodeURIComponent(query)}&limit=${maxImages}`, `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`];
    let imageUrls = [];
    for (const url of apis) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) continue;
        const data = await res.json();
        let extracted = [];
        if (data.result && Array.isArray(data.result)) extracted = data.result.map(item => item.image || item.url).filter(Boolean);
        else if (data.data && Array.isArray(data.data)) extracted = data.data.map(item => item.image || item.url).filter(Boolean);
        else if (data.url || data.image) extracted = [data.url || data.image];
        imageUrls = [...new Set([...imageUrls, ...extracted.filter(u => typeof u === 'string' && u.startsWith('http'))])];
        if (imageUrls.length >= maxImages) break;
      } catch (err) {}
    }
    if (imageUrls.length === 0) {
      await sock.sendMessage(from, { text: `❌ No se encontraron resultados.`, edit: waitMsg.key });
      return sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    }
    const finalUrls = imageUrls.slice(0, maxImages);
    await sock.sendMessage(from, { text: `✅ *Encontradas:* ${finalUrls.length} imágenes`, edit: waitMsg.key }).catch(()=>{});
    const albumMedia = finalUrls.map((url, i) => ({ image: { url }, caption: i === 0 ? `📌 *Pinterest:* ${query}` : undefined }));
    try { await sock.sendMessage(from, { album: albumMedia }, { quoted: m }); } 
    catch (e) { for (const url of finalUrls) await sock.sendMessage(from, { image: { url }, caption: `📌 ${query}` }, { quoted: m }); }
    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  }
};
