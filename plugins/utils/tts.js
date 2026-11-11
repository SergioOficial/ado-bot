import axios from "axios";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export default {
  command: ["tts", "voz"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const text = args.join(" ");
    if (!text) return enviartexto(`❌ Uso: ${config.prefix[0]}tts <texto a convertir en voz>`);

    await sock.sendMessage(from, { react: { text: "🎤", key: m.key } });

    const tmpDir = "./tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const inputFile = path.join(tmpDir, `tts_in_${Date.now()}.mp3`);
    const outputFile = path.join(tmpDir, `tts_out_${Date.now()}.ogg`);

    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=es&client=tw-ob`;
      const res = await axios.get(url, { 
        responseType: 'arraybuffer', 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      
      const arrayBuffer = res.data;
      fs.writeFileSync(inputFile, Buffer.from(arrayBuffer));

      let audioBuffer = Buffer.from(arrayBuffer);
      let mimetype = "audio/mpeg";
      let isPtt = false;

      try {
        const ffmpegCmd = `ffmpeg -y -i "${inputFile}" -c:a libopus -ac 1 -b:a 32k -ar 16000 "${outputFile}"`;
        
        await new Promise((resolve, reject) => {
          const child = spawn("ffmpeg", ffmpegCmd.split(" ").slice(1), { stdio: "ignore" });
          child.on("error", (err) => reject(err));
          child.on("close", (code) => code === 0 ? resolve() : reject(new Error("Falló ffmpeg")));
        });

        audioBuffer = fs.readFileSync(outputFile);
        mimetype = "audio/ogg; codecs=opus";
        isPtt = true;

      } catch (ffmpegError) {
        console.log("⚠️ ffmpeg no está instalado. Enviando como MP3 normal.");
      }

      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: mimetype,
        ptt: isPtt,
        fileName: `tts_${Date.now()}.${isPtt ? 'ogg' : 'mp3'}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en TTS:", e.message);
      await enviartexto(`❌ Error al generar el audio: ${e.message}`);
    } finally {
      try { if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile); } catch {}
      try { if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile); } catch {}
    }
  }
};