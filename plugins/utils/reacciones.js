import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static"; // 📌 Importamos el binario estático

const execAsync = promisify(exec);

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

    try {
      const res = await axios.get(`https://api.stellarwa.xyz/sfw/interaction?key=api-uJijf&cat=${comando}`, { timeout: 8000 });
      mediaUrl = extraerUrl(res.data);
    } catch (e) { console.log(`StellarWa falló:`, e.message); }

    if (!mediaUrl) {
      try {
        const res = await axios.get(`https://nekos.best/api/v2/${reaccion.nekos}`, { timeout: 8000 });
        if (res.data?.results?.[0]?.url) mediaUrl = res.data.results[0].url;
      } catch (e) { console.log(`Nekos.best falló:`, e.message); }
    }

    if (!mediaUrl) {
      try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${reaccion.waifu}`, { timeout: 8000 });
        if (res.data?.url) mediaUrl = res.data.url;
      } catch (e) { console.log(`Waifu.pics falló:`, e.message); }
    }

    if (!mediaUrl) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return enviartexto(`❌ No se pudo obtener el GIF para *${comando}*.`);
    }

    const gifPath = `./tmp-${Date.now()}.gif`;
    const mp4Path = `./tmp-${Date.now()}.mp4`;

    try {
      const res = await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 15000 });
      fs.writeFileSync(gifPath, Buffer.from(res.data));

      // 📌 Usamos ffmpegPath en lugar del comando global "ffmpeg"
      await execAsync(
        `"${ffmpegPath}" -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an "${mp4Path}"`
      );

      await sock.sendMessage(from, {
        video: fs.readFileSync(mp4Path),
        gifPlayback: true,
        caption: `✨ *Reacción:* ${comando.toUpperCase()}`,
        mimetype: "video/mp4"
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error con ffmpeg-static:", e.message);
      // Respaldo: enviar el GIF como documento
      try {
        await sock.sendMessage(from, {
          document: fs.readFileSync(gifPath),
          mimetype: "image/gif",
          fileName: `${comando}.gif`,
          caption: `✨ *Reacción:* ${comando.toUpperCase()} (Abre el archivo para verlo)`
        }, { quoted: m });
        await sock.sendMessage(from, { react: { text: "⚠️", key: m.key } });
      } catch (err) {
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      }
    } finally {
      if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath);
      if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
    }
  }
};