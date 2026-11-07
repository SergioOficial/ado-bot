import axios from "axios";
import sharp from "sharp";

const MAX_IMAGES = 5; // Enviamos 5 para no saturar

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
  
  // Comprimir a 600px y calidad 70 para que pese muy poco
  return await sharp(Buffer.from(imgRes.data))
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
}

export default {
  command: ["pinterest", "pin", "pint", "pinterestimg"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config, BOT_NAME } = ctx;
    const query = args.join(" ").trim();

    if (!query) {
      return enviartexto(
        '📌 *PINTEREST*\n\n' +
        `Uso: ${config.prefix}pin <búsqueda>\n` +
        `Ejemplo: ${config.prefix}pin paisajes de anime\n\n` +
        '_Recibirás las imágenes._'
      );
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // Detectar si estamos en modo privado (si 'from' es distinto al chat original)
    const isPrivate = from !== m.key.remoteJid;
    const quotedMsg = isPrivate ? null : m; 

    try {
      let results = [];

      // 1. API Principal (Natsu)
      try {
        const natsuUrl = `https://natsu-api.darkcore.xyz/api/pinterest?q=${encodeURIComponent(query)}`;
        const res = await axios.get(natsuUrl, { timeout: 10000 });
        if (res.data && res.data.results) results = res.data.results;
      } catch (err) {
        console.log("Natsu falló, usando Siputzx...");
      }

      // 2. API de Respaldo (Siputzx)
      if (!results || results.length === 0) {
        try {
          const siputzxUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`;
          const res = await axios.get(siputzxUrl);
          if (res.data.data) results = res.data.data.map(item => ({ image: item.image_url || item.url }));
        } catch (err) {
          console.log("Siputzx falló...");
        }
      }

      const normalized = normalizeResults(results);
      if (!normalized.length) throw new Error("No encontré imágenes para esa búsqueda");

      const picked = shuffle(normalized).slice(0, MAX_IMAGES);
      
      // Descargar y comprimir
      const buffers = await Promise.allSettled(picked.map(item => fetchImageBuffer(smallImage(item.image))));
      
      const loadedImages = buffers
        .filter(b => b.status === "fulfilled")
        .map(b => b.value);

      if (!loadedImages.length) throw new Error("Las imágenes no pudieron ser descargadas");

      // 🎨 DECO: El mensaje de introducción
      const intro = 
        `📌 *PINTEREST*\n\n` +
        `🔎 *${clean(query, 80)}*\n\n` +
        `🖼️ ${loadedImages.length} imágenes encontradas`;

      await enviartexto(intro);

      // 📤 Enviar imágenes una por una
      for (let i = 0; i < loadedImages.length; i++) {
        try {
          await sock.sendMessage(from, { 
            image: loadedImages[i], 
            caption: i === 0 ? `📌 *Pinterest:* ${clean(query, 50)}\n\n> ${BOT_NAME}` : undefined 
          }, { quoted: i === 0 ? quotedMsg : null }); // Solo citamos la primera y si no es privado
          
          await new Promise(r => setTimeout(r, 1200)); // Pausa de 1.2s entre imágenes
        } catch (err) {
          console.error(`Error enviando imagen ${i}:`, err.message);
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
