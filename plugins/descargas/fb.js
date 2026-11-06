import axios from "axios";

export default {
  command: ["fb", "facebook", "fbdl"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const url = args[0];
    if (!url || !url.includes("facebook.com")) return enviartexto(`❌ Uso: ${config.prefix}fb <url_de_facebook>`);

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `⏳ *Descargando video...*` }, { quoted: m });

    try {
      const api = `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 15000 });
      
      const data = res.data;
      if (!data.status || !data.data || data.data.length === 0) throw new Error("No se pudo extraer el video.");

      const videoUrl = data.data.find(v => v.quality === 'hd')?.url || data.data[0].url;
      
      // Descargar video como buffer (evita fallos)
      const vidRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const buffer = Buffer.from(vidRes.data, 'binary');

      await sock.sendMessage(from, {
        video: buffer,
        caption: `✅ *Video descargado*`,
        mimetype: 'video/mp4'
      }, { quoted: m });

      await sock.sendMessage(from, { delete: waitMsg.key }).catch(()=>{});
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error FB:", e.message);
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: waitMsg.key }).catch(()=>{});
    }
  }
};
