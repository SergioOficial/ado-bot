export default {
  command: ["pinterest", "pin"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const rawArgs = args.join(" ").trim();
    
    if (!rawArgs) {
      return enviartexto(`❌ Uso: ${config.prefix}pinterest <búsqueda> [cantidad]`);
    }

    const match = rawArgs.match(/(.*?)(?:\s+(\d+))?$/);
    const query = match[1].trim();
    const limit = parseInt(match[2]) || 5;
    const maxImages = Math.min(limit, 10);

    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `🔍 Buscando *${maxImages}* imágenes de: *${query}*...` }, { quoted: m });

    // API activa de Siputzx (verificada)
    const apiUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`;
    let imageUrls = [];

    try {
      const res = await fetch(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        const json = await res.json();
        // La respuesta real tiene la estructura: { status: true, data: [ { image_url: "..." }, ... ] }
        if (json.data && Array.isArray(json.data)) {
          imageUrls = json.data
            .map(item => item.image_url || item.url) // Prioriza image_url
            .filter(url => typeof url === 'string' && url.startsWith('http'));
        }
      }
    } catch (err) {
      console.error("Error en API de Pinterest:", err.message);
    }

    // Eliminar duplicados y limitar
    imageUrls = [...new Set(imageUrls)].slice(0, maxImages);

    if (imageUrls.length === 0) {
      await sock.sendMessage(from, { 
        text: `❌ No se encontraron resultados para *${query}*. Intenta con otra búsqueda.`, 
        edit: waitMsg.key 
      }).catch(() => {});
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return;
    }

    // Editar mensaje para indicar éxito
    await sock.sendMessage(from, { 
      text: `✅ *Encontradas:* ${imageUrls.length} imágenes\n📤 *Enviando álbum de:* ${query}...`, 
      edit: waitMsg.key 
    }).catch(() => {});

    // Enviar como álbum
    const albumMedia = imageUrls.map((url, index) => ({
      image: { url },
      caption: index === 0 ? `📌 *Pinterest:* ${query}` : undefined
    }));

    try {
      await sock.sendMessage(from, { album: albumMedia }, { quoted: m });
    } catch (albumErr) {
      console.error("Error enviando álbum, enviando individualmente:", albumErr);
      for (const url of imageUrls) {
        try {
          await sock.sendMessage(from, { image: { url }, caption: `📌 ${query}` }, { quoted: m });
          await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          console.error("Error enviando imagen individual:", e);
        }
      }
    }

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
  }
};
