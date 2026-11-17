import axios from "axios";

// Mapeo de comandos a categorías en las APIs
const reacciones = {
  angry:  { nekos: "angry",  waifu: "angry" },
  kill:   { nekos: "kill",   waifu: "kill" },
  sleep:  { nekos: "sleep",  waifu: "sleep" },
  hug:    { nekos: "hug",    waifu: "hug" },
  kiss:   { nekos: "kiss",   waifu: "kiss" },
  pat:    { nekos: "pat",    waifu: "pat" },
  slap:   { nekos: "slap",   waifu: "slap" },
  cry:    { nekos: "cry",    waifu: "cry" },
  dance:  { nekos: "dance",  waifu: "dance" },
  smile:  { nekos: "smile",  waifu: "smile" },
  wave:   { nekos: "wave",   waifu: "wave" },
  bonk:   { nekos: "bonk",   waifu: "bonk" },
  bite:   { nekos: "bite",   waifu: "bite" },
  blush:  { nekos: "blush",  waifu: "blush" },
  cuddle: { nekos: "cuddle", waifu: "cuddle" }
};

// Busca recursivamente cualquier URL de medio en el JSON de respuesta
function extraerUrl(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj === "string" && /^https?:\/\/.+\.(gif|mp4|webm|png|jpg|jpeg)(\?|$)/i.test(obj)) {
    return obj;
  }
  for (const valor of Object.values(obj)) {
    const encontrada = extraerUrl(valor);
    if (encontrada) return encontrada;
  }
  return null;
}

export default {
  command: Object.keys(reacciones),
  execute: async (ctx) => {
    const { sock, from, m, comando, enviartexto } = ctx;

    const reaccion = reacciones[comando];
    if (!reaccion) return;

    await sock.sendMessage(from, { react: { text: "🫱", key: m.key } });

    let mediaUrl = null;

    // 1️⃣ StellarWa (principal)
    try {
      const res = await axios.get(
        `https://api.stellarwa.xyz/sfw/interaction?key=api-uJijf&cat=${comando}`,
        { timeout: 8000 }
      );
      mediaUrl = extraerUrl(res.data);
      if (mediaUrl) console.log(`StellarWa OK → ${mediaUrl}`);
    } catch (e) {
      console.log(`StellarWa falló para ${comando}:`, e.message);
    }

    // 2️⃣ Nekos.best (respaldo)
    if (!mediaUrl) {
      try {
        const res = await axios.get(`https://nekos.best/api/v2/${reaccion.nekos}`, { timeout: 8000 });
        if (res.data?.results?.[0]?.url) mediaUrl = res.data.results[0].url;
      } catch (e) {
        console.log(`Nekos.best falló para ${comando}:`, e.message);
      }
    }

    // 3️⃣ Waifu.pics (respaldo)
    if (!mediaUrl) {
      try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${reaccion.waifu}`, { timeout: 8000 });
        if (res.data?.url) mediaUrl = res.data.url;
      } catch (e) {
        console.log(`Waifu.pics falló para ${comando}:`, e.message);
      }
    }

    if (!mediaUrl) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto(`❌ No se pudo obtener el GIF para *${comando}*. Intenta de nuevo más tarde.`);
    }

    // 4️⃣ Descargar y enviar como GIF (sin ffmpeg)
    try {
      const res = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        timeout: 15000
      });
      const buffer = Buffer.from(res.data);
      const contentType = (res.headers["content-type"] || "").toLowerCase();
      const caption = `✨ *Reacción:* ${comando.toUpperCase()}`;

      // Detectar si es imagen estática o GIF/video
      const esGif     = contentType.includes("gif") || /\.gif(\?|$)/i.test(mediaUrl);
      const esImagen  = contentType.startsWith("image/") && !esGif;

      if (esImagen) {
        // PNG / JPG estáticos → enviar como imagen
        await sock.sendMessage(from, { image: buffer, caption }, { quoted: m });
      } else {
        // GIF / MP4 / WEBM → enviar con gifPlayback (reproduce en bucle)
        await sock.sendMessage(
          from,
          {
            video: buffer,
            gifPlayback: true,
            caption,
            mimetype: "video/mp4"
          },
          { quoted: m }
        );
      }

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al enviar media:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`⚠️ No se pudo enviar el GIF de *${comando}*.\n_${e.message}_`);
    }
  }
};