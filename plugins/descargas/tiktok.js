import axios from "axios";

export default {
  command: ["tiktok", "tt", "ttdl"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const url = args[0];
    if (!url || !url.includes("tiktok.com")) return enviartexto(`❌ Uso: ${config.prefix}tt <enlace de tiktok>`);

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `⏳ *Descargando de TikTok...*` }, { quoted: m });

    try {
      const api = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 15000 });
      
      const data = res.data.data;
      if (!data || !data.video) throw new Error("No se pudo extraer el video.");

      const videoUrl = data.video;
      const vidRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(vidRes.data, 'binary');

      await sock.sendMessage(from, {
        video: buffer,
        caption: `✅ *TikTok Descargado*\n\n> 👤 Autor: ${data.author || "Desconocido"}\n> 🎵 Música: ${data.music || "Original"}`
      }, { quoted: m });

      await sock.sendMessage(from, { delete: waitMsg.key }).catch(()=>{});
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error TikTok:", e.message);
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: waitMsg.key }).catch(()=>{});
    }
  }
};
