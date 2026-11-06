import axios from "axios";

export default {
  command: ["pinterest", "pin"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const rawArgs = args.join(" ").trim();
    
    if (!rawArgs) return enviartexto(`❌ Uso: ${config.prefix}pinterest <búsqueda> [cantidad]`);

    const match = rawArgs.match(/(.*?)(?:\s+(\d+))?$/);
    const query = match[1].trim();
    const limit = parseInt(match[2]) || 5;
    const maxImages = Math.min(limit, 5); // Máximo 5 para no saturar

    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `🔍 Buscando *${maxImages}* imágenes de: *${query}*...` }, { quoted: m });

    try {
      const apiUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`;
      const res = await axios.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      
      let imageUrls = [];
      if (res.data.data && Array.isArray(res.data.data)) {
        imageUrls = res.data.data
          .map(item => item.image_url || item.url)
          .filter(url => typeof url === 'string' && url.startsWith('http'));
      }

      imageUrls = [...new Set(imageUrls)].slice(0, maxImages);

      if (imageUrls.length === 0) {
        await sock.sendMessage(from, { text: `❌ No se encontraron resultados.`, edit: waitMsg.key }).catch(()=>{});
        return sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      }

      await sock.sendMessage(from, { text: `✅ *Encontradas:* ${imageUrls.length} imágenes\n📤 *Descargando y enviando...*`, edit: waitMsg.key }).catch(()=>{});

      for (let i = 0; i < imageUrls.length; i++) {
        try {
          // Descargar cada imagen con axios
          const imgRes = await axios.get(imageUrls[i], { responseType: 'arraybuffer', timeout: 15000 });
          const buffer = Buffer.from(imgRes.data, 'binary');

          await sock.sendMessage(from, { 
            image: buffer, 
            caption: i === 0 ? `📌 *Pinterest:* ${query}` : undefined 
          }, { quoted: m });
          
          await new Promise(r => setTimeout(r, 1000)); // Pausa entre imágenes
        } catch (imgErr) {
          console.error(`Error descargando imagen ${i}:`, imgErr.message);
        }
      }

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error("Error en Pinterest:", err.message);
      await sock.sendMessage(from, { text: `❌ Error al buscar imágenes.\n_${err.message}_`, edit: waitMsg.key }).catch(()=>{});
    }
  }
};
