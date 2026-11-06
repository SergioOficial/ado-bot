export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const text = args.join(" ").trim();
    if (!text) return enviartexto("《✧》Menciona el nombre o URL del video.");
    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
    try {
      const { default: yts } = await import("yt-search");
      const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
      const query = videoMatch ? "https://youtu.be/" + videoMatch[1] : text;
      let url = query, title = null, thumbBuffer = null;
      try {
        const search = await yts(query);
        if (search.all.length) {
          const v = videoMatch ? search.videos.find(x => x.videoId === videoMatch[1]) || search.all[0] : search.all[0];
          url = v.url; title = v.title;
          const tr = await fetch(v.image); thumbBuffer = Buffer.from(await tr.arrayBuffer());
          await sock.sendMessage(from, { image: thumbBuffer, caption: `➩ Descargando › *${title}*\n\n> ❖ Canal › *${v.author?.name || "Desconocido"}*\n> ⴵ Duración › *${v.timestamp}*` }, { quoted: m });
        }
      } catch (e) {}
      // APIs de descarga (simplificado)
      const APIs = { adonix: { url: 'https://api.adonix.com', key: 'Yuki-WaBot' }, stellar: { url: 'https://api.stellarwa.xyz', key: 'YukiWaBot' }, nekolabs: { url: 'https://api.nekolabs.com' } };
      const apis = [
        { endpoint: `${APIs.adonix.url}/download/ytaudio?apikey=${APIs.adonix.key}&url=${encodeURIComponent(url)}`, extractor: res => res?.data?.url },
        { endpoint: `${APIs.stellar.url}/dl/ytmp3?url=${encodeURIComponent(url)}&quality=256&key=${APIs.stellar.key}`, extractor: res => res.data?.dl },
        { endpoint: `https://tester-web.onrender.com/api/download?url=${encodeURIComponent(url)}`, extractor: res => res.result?.downloadUrl }
      ];
      let audioUrl = null;
      for (const { endpoint, extractor } of apis) {
        try { const r = await fetch(endpoint).then(x => x.json()); const link = extractor(r); if (link) { audioUrl = link; break; } } catch {}
      }
      if (!audioUrl) return enviartexto("《✧》 No se pudo descargar el audio.");
      const audioRes = await fetch(audioUrl); const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      await sock.sendMessage(from, { audio: audioBuffer, fileName: `${title || "audio"}.mp3`, mimetype: "audio/mpeg" }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) { await enviartexto(`❌ Error: ${e.message}`); }
  }
};
