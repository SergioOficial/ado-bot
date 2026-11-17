import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

// 🔍 Busca recursivamente cualquier URL de imagen/video en un objeto JSON
function extraerUrl(obj) {
  if (!obj || typeof obj !== "object") return null;

  // Si es un string que parece una URL de medio, la devolvemos
  if (typeof obj === "string" && /^https?:\/\/.+\.(gif|mp4|webm|png|jpg|jpeg)/i.test(obj)) {
    return obj;
  }

  // Recorremos arrays y objetos
  for (const valor of Object.values(obj)) {
    const encontrada = extraerUrl(valor);
    if (encontrada) return encontrada;
  }
  return null;
}

export default {
  command: Object.keys(reacciones),
  execute: async (ctx) => {
    const { sock, from, m, sender, comando, enviartexto, config } = ctx;

    const reaccion = reacciones[comando];
    if (!reaccion) return;

    await sock.sendMessage(from, { react: { text: "🫱", key: m.key } });

    let mediaUrl = null;

    // 1️⃣ StellarWa (principal) — se le pasa el comando como categoría
    try {
      const url = `https://api.stellarwa.xyz/sfw/interaction?key=api-uJijf&cat=${comando}`;
      const res = await axios.get(url, { timeout: 8000 });
      mediaUrl = extraerUrl(res.data); // busca la URL en cualquier parte del JSON
      if (mediaUrl) console.log(`StellarWa OK → ${mediaUrl}`);
    } catch (e) {
      console.log(`StellarWa falló para ${comando}:`, e.message);
    }

    // 2️⃣ Nekos.best (respaldo 1)
    if (!mediaUrl) {
      try {
        const res = await axios.get(`https://nekos.best/api/v2/${reaccion.nekos}`, { timeout: 8000 });
        if (res.data?.results?.[0]?.url) mediaUrl = res.data.results[0].url;
      } catch (e) {
        console.log(`Nekos.best falló para ${comando}:`, e.message);
      }
    }

    // 3️⃣ Waifu.pics (respaldo 2)
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

    // 4️⃣ Convertir GIF → MP4 real (igual que antes)
    try {
      const gifPath = `./tmp-${Date.now()}.gif`;
      const mp4Path = `./tmp-${Date.now()}.mp4`;

      const buffer = (await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 10000 })).data;
      fs.writeFileSync(gifPath, Buffer.from(buffer));

      await execAsync(
        `ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an "${mp4Path}"`
      );

      await sock.sendMessage(from, {
        video: fs.readFileSync(mp4Path),
        caption: `✨ *Reacción:* ${comando.toUpperCase()}`,
        mimetype: "video/mp4"
      }, { quoted: m });

      fs.unlinkSync(gifPath);
      fs.unlinkSync(mp4Path);

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al enviar el video:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`⚠️ No se pudo procesar el video de *${comando}*.`);
    }
  }
};