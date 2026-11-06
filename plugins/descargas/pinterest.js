import axios from "axios";
import sharp from "sharp";

const MAX_CARDS = 8;

function clean(value, max = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function smallImage(url) {
  const value = String(url || "");
  return value.includes("/originals/") ? value.replace("/originals/", "/474x/") : value;
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function normalizeResults(results) {
  const seen = new Set();
  const list = [];
  for (const item of Array.isArray(results) ? results : []) {
    const image = String(item?.image || item?.image_url || "");
    if (!image || seen.has(image)) continue;
    seen.add(image);
    list.push({ ...item, image });
  }
  return list;
}

async function fetchImageBuffer(url) {
  const imgRes = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  
  // 🗜️ Optimizamos la imagen para evitar el fallo de subida
  return await sharp(Buffer.from(imgRes.data))
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export default {
  command: ["pinterest", "pin", "pint", "pinterestimg"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ").trim();

    if (!query) {
      return enviartexto(
        `📌 *PINTEREST*\n\nUso: ${config.prefix}pin <búsqueda>\nEjemplo: ${config.prefix}pin paisajes de anime`
      );
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      let results = [];

      // 1. Intentar con la API de Natsu (la que me indicaste)
      try {
        // Nota: Asumimos que el endpoint es /api/pinterest y recibe ?q=
        const natsuUrl = `https://natsu-api.darkcore.xyz/api/pinterest?q=${encodeURIComponent(query)}`;
        const res = await axios.get(natsuUrl, { timeout: 10000 });
        
        // Adaptamos la respuesta según lo que espera tu código
        if (res.data && res.data.results) {
          results = res.data.results;
        }
      } catch (err) {
        console.log("API de Natsu falló, usando Siputzx de respaldo...");
        // 2. Fallback (Respaldo) a Siputzx
        const siputzxUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`;
        const res = await axios.get(siputzxUrl);
        if (res.data.data) {
          // Mapeamos la respuesta de Siputzx al formato del código
          results = res.data.data.map(item => ({ image: item.image_url || item.url }));
        }
      }

      const normalized = normalizeResults(results);
      if (!normalized.length) throw new Error("No se encontraron imágenes para esa búsqueda.");

      const picked = shuffle(normalized).slice(0, MAX_CARDS);
      
      // 3. Descargar y comprimir todas las imágenes
      const buffers = await Promise.allSettled(picked.map(item => fetchImageBuffer(smallImage(item.image))));
      
      const loadedImages = buffers
        .filter(b => b.status === "fulfilled")
        .map(b => b.value);

      if (!loadedImages.length) throw new Error("Las imágenes no pudieron ser descargadas.");

      // 4. Enviar como Álbum de WhatsApp (Carrusel nativo)
      const albumMedia = loadedImages.map((buffer, index) => ({
        image: buffer,
        caption: index === 0 ? `📌 *Pinterest:* ${clean(query, 50)}\n> Encontradas: ${loadedImages.length}` : undefined
      }));

      try {
        await sock.sendMessage(from, { album: albumMedia }, { quoted: m });
      } catch (albumErr) {
        // Si falla el álbum, enviamos una por una
        for (let i = 0; i < loadedImages.length; i++) {
          await sock.sendMessage(from, { image: loadedImages[i] }, { quoted: m });
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (error) {
      console.error("Error en Pinterest:", error.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ No pude buscar en Pinterest: ${error.message}`);
    }
  }
};
