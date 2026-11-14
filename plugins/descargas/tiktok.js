import axios from "axios";

export default {
  command: ["tiktok", "tt", "ttdl"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const url = args[0];

    if (!url) return enviartexto(`❌ Uso: ${config.prefix[0]}tt <enlace de tiktok>`);
    if (!url.match(/tiktok\.com/)) return enviartexto("❌ El enlace no es de TikTok.");

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `⏳ *Descargando de TikTok...*` }, { quoted: m });

    try {
      const evogbUrl = `https://evogb.win/api/dl/tiktok?url=${encodeURIComponent(url)}`;
      const res = await axios.get(evogbUrl, { timeout: 25000 });
      const data = res.data;

      const videoUrl = 
        data.video || 
        data.url || 
        data.download || 
        data.result?.video || 
        data.result?.url || 
        data.data?.url;

      if (!videoUrl) throw new Error("No se pudo extraer el video.");

      const vidRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 40000 });
      const buffer = Buffer.from(vidRes.data);

      const caption = `✅ *TikTok Descargado*\n\n> 👤 Autor: ${data.author || data.result?.author || "Desconocido"}\n> 🎵 Música: Original`;

      await sock.sendMessage(from, { video: buffer, caption, mimetype: 'video/mp4' }, { quoted: m });
      await sock.sendMessage(from, { delete: waitMsg.key }).catch(()=>{});
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error TikTok:", e.message);
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: waitMsg.key }).catch(()=>{});
    }
  }
};