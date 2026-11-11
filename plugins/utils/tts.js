import { execFile } from "child_process";
import fs from "fs";
import path from "path";

export default {
  command: ["tts", "voz"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const text = args.join(" ");
    if (!text) return enviartexto(`❌ Uso: ${config.prefix}tts <texto a convertir en voz>`);

    await sock.sendMessage(from, { react: { text: "🎤", key: m.key } });

    const tmpDir = "./tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const inputFile = path.join(tmpDir, `tts_in_${Date.now()}.mp3`);
    const outputFile = path.join(tmpDir, `tts_out_${Date.now()}.ogg`);

    try {
      // 1. Descargar el audio en MP3 desde Google TTS
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=es&client=tw-ob`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error("Error al descargar el audio de Google.");
      
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(inputFile, Buffer.from(arrayBuffer));

      // 2. Convertir a OGG/Opus mono con ffmpeg (el formato que WhatsApp espera)
      // -c:a libopus: códec opus
      // -ac 1: 1 canal (mono)
      // -b:a 32k: bitrate bajo (ideal para voz)
      // -ar 16000: sample rate de 16kHz (nativo de WhatsApp)
      // execFile y no exec: los argumentos van en una lista, así que ninguna
      // comilla o `;` de un nombre de archivo puede acabar siendo una orden.
      const argsFfmpeg = ["-y", "-i", inputFile, "-c:a", "libopus", "-ac", "1", "-b:a", "32k", "-ar", "16000", outputFile];

      await new Promise((resolve, reject) => {
        execFile("ffmpeg", argsFfmpeg, (error) => {
          if (error) reject(new Error(`ffmpeg: ${error.message}`));
          else resolve();
        });
      });

      // 3. Leer el archivo convertido y enviarlo como nota de voz
      const audioBuffer = fs.readFileSync(outputFile);

      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/ogg; codecs=opus', // Mimetype correcto para PTT
        ptt: true, // 👈 Activa la nota de voz
        fileName: `tts_${Date.now()}.ogg`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en TTS:", e.message);
      await enviartexto(`❌ Error al generar la nota de voz: ${e.message}`);
    } finally {
      // 4. Limpiar los archivos temporales
      try { if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile); } catch {}
      try { if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile); } catch {}
    }
  }
};
