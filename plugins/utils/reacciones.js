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

export default {
  command: Object.keys(reacciones),
  execute: async (ctx) => {
    const { sock, from, m, sender, comando, enviartexto, config } = ctx;

    const reaccion = reacciones[comando];
    if (!reaccion) return;

    await sock.sendMessage(from, { react: { text: "🎬", key: m.key } });

    let gifUrl = null;

    // 1. Nekos.best (principal)
    try {
      const res = await axios.get(`https://nekos.best/api/v2/${reaccion.nekos}`, { timeout: 8000 });
      if (res.data?.results?.[0]?.url) gifUrl = res.data.results[0].url;
    } catch (e) {
      console.log(`Nekos.best falló para ${comando}:`, e.message);
    }

    // 2. Waifu.pics (respaldo)
    if (!gifUrl) {
      try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${reaccion.waifu}`, { timeout: 8000 });
        if (res.data?.url) gifUrl = res.data.url;
      } catch (e) {
        console.log(`Waifu.pics falló para ${comando}:`, e.message);
      }
    }

    if (!gifUrl) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto(`❌ No se pudo obtener el GIF para *${comando}*. Intenta de nuevo más tarde.`);
    }

    // 3. Convertir GIF → MP4 real (esto arregla el problema de descarga)
    try {
      const gifPath = `./tmp-${Date.now()}.gif`;
      const mp4Path = `./tmp-${Date.now()}.mp4`;

      const buffer = (await axios.get(gifUrl, { responseType: "arraybuffer", timeout: 10000 })).data;
      fs.writeFileSync(gifPath, Buffer.from(buffer));

      await execAsync(
        `ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an "${mp4Path}"`
      );

      await sock.sendMessage(from, {
        video: fs.readFileSync(mp4Path),
        caption: `✨ *Reacción:* ${comando.toUpperCase()}`,
        gifPlayback: true
      }, { quoted: m });

      fs.unlinkSync(gifPath);
      fs.unlinkSync(mp4Path);

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al enviar el GIF:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`⚠️ No se pudo procesar el GIF de *${comando}*.`);
    }
  }
};