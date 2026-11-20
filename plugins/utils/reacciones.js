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

export default {
  command: Object.keys(reacciones),
  category: "fun",
  execute: async (ctx) => {
    const { sock, from, m, comando, enviartexto } = ctx;
    const reaccion = reacciones[comando];
    if (!reaccion) return;

    await sock.sendMessage(from, { react: { text: "🎬", key: m.key } });

    let mediaUrl = null;

    // 1. Nekos.best
    try {
      const res = await axios.get(`https://nekos.best/api/v2/${reaccion.nekos}`, { timeout: 8000 });
      if (res.data?.results?.[0]?.url) mediaUrl = res.data.results[0].url;
    } catch (e) {}

    // 2. Waifu.pics (Respaldo)
    if (!mediaUrl) {
      try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${reaccion.waifu}`, { timeout: 8000 });
        if (res.data?.url) mediaUrl = res.data.url;
      } catch (e) {}
    }

    if (!mediaUrl) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto(`❌ No se pudo obtener la reacción para *${comando}*.`);
    }

    // Enviar como video/GIF (sin usar FFmpeg ni paquetes externos)
    try {
      await sock.sendMessage(from, {
        video: { url: mediaUrl },
        caption: `✨ *Reacción:* ${comando.toUpperCase()}`,
        gifPlayback: true,
        mimetype: "video/mp4"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al enviar:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`⚠️ Error al enviar el video.`);
    }
  }
};