import axios from "axios";

// Mapeo de comandos a categorías en las APIs
// Nekos.best y Waifu.pics usan nombres similares para sus endpoints
const reacciones = {
  // Reacciones solicitadas
  angry:    { nekos: "angry",    waifu: "angry" },
  kill:     { nekos: "kill",     waifu: "kill" },
  sleep:    { nekos: "sleep",    waifu: "sleep" }, // Nekos.best tiene un endpoint para dormir
  
  // Otras reacciones populares que puedes añadir
  hug:      { nekos: "hug",      waifu: "hug" },
  kiss:     { nekos: "kiss",     waifu: "kiss" },
  pat:      { nekos: "pat",      waifu: "pat" },
  slap:     { nekos: "slap",     waifu: "slap" },
  cry:      { nekos: "cry",      waifu: "cry" },
  dance:    { nekos: "dance",    waifu: "dance" },
  smile:    { nekos: "smile",    waifu: "smile" },
  wave:     { nekos: "wave",     waifu: "wave" },
  bonk:     { nekos: "bonk",     waifu: "bonk" },
  bite:     { nekos: "bite",     waifu: "bite" },
  blush:    { nekos: "blush",    waifu: "blush" },
  cuddle:   { nekos: "cuddle",   waifu: "cuddle" }
};

export default {
  command: Object.keys(reacciones),
  execute: async (ctx) => {
    const { sock, from, m, sender, comando, enviartexto, config } = ctx;

    // 1. Verificar si el comando está en la lista
    const reaccion = reacciones[comando];
    if (!reaccion) return;

    await sock.sendMessage(from, { react: { text: "🎬", key: m.key } });

    let gifUrl = null;
    let apiUsada = "";

    // 2. Intentar con Nekos.best (Principal)
    try {
      const res = await axios.get(`https://nekos.best/api/v2/${reaccion.nekos}`, { timeout: 8000 });
      if (res.data?.results?.[0]?.url) {
        gifUrl = res.data.results[0].url;
        apiUsada = "Nekos.best";
      }
    } catch (e) {
      console.log(`Nekos.best falló para ${comando}:`, e.message);
    }

    // 3. Si falla, intentar con Waifu.pics (Respaldo)
    if (!gifUrl) {
      try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${reaccion.waifu}`, { timeout: 8000 });
        if (res.data?.url) {
          gifUrl = res.data.url;
          apiUsada = "Waifu.pics";
        }
      } catch (e) {
        console.log(`Waifu.pics falló para ${comando}:`, e.message);
      }
    }

    // 4. Si ninguna funcionó, avisar
    if (!gifUrl) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto(`❌ No se pudo obtener el GIF para *${comando}*. Intenta de nuevo más tarde.`);
    }

    // 5. Enviar el GIF como video con reproducción automática (gifPlayback)
    try {
      await sock.sendMessage(from, {
        video: { url: gifUrl },
        caption: `✨ *Reacción:* ${comando.toUpperCase()}\n> 🎬 *Fuente:* ${apiUsada}`,
        gifPlayback: true, // 👈 Esto hace que WhatsApp lo reproduzca como GIF
        mimetype: "video/mp4"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al enviar el GIF:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`⚠️ Se encontró el GIF pero no se pudo enviar.\n🔗 ${gifUrl}`);
    }
  }
};