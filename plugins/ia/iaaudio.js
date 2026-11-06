import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

export default {
  command: ["iaaudio", "iaa", "vozi"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;
    const text = args.join(" ").trim();
    
    if (!text) return enviartexto(`✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\nEjemplo: ${config.prefix}iaa ¿Qué es el amor?`);

    const waitMsg = await sock.sendMessage(from, { text: `⏳ *${BOT_NAME}* está pensando y generando audio...` }, { quoted: m });

    const tmpDir = "./tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const inputFile = path.join(tmpDir, `iaa_in_${Date.now()}.mp3`);
    const outputFile = path.join(tmpDir, `iaa_out_${Date.now()}.ogg`);

    try {
      let aiResponse = null;
      const prompt = `Eres ${BOT_NAME}. Responde en español, de forma clara, amable y concisa (máximo 2 oraciones). Pregunta: ${text}`;

      // Array de APIs de texto (Fallback)
      const apisTexto = [
        {
          url: `https://api.stellarwa.xyz/ai/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}&key=YukiWaBot`,
          extract: (json) => json?.result?.text || json?.result || json?.results
        },
        {
          url: `https://api.vreden.web.id/api/v1/ai/gpt?query=${encodeURIComponent(text)}`,
          extract: (json) => json?.result || json?.message
        },
        {
          url: `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
          extract: (data) => data // Pollinations devuelve texto plano
        }
      ];

      // Intentar obtener respuesta de las APIs en orden
      for (const api of apisTexto) {
        try {
          const res = await axios.get(api.url, { timeout: 15000 });
          const extracted = api.extract(res.data);
          if (extracted && typeof extracted === 'string' && extracted.trim().length > 0) {
            aiResponse = extracted.trim();
            break; // Si obtiene respuesta, detiene el bucle
          }
        } catch (err) {
          console.log(`⚠️ API de IA falló (${err.message}), intentando la siguiente...`);
        }
      }

      if (!aiResponse) throw new Error("Todas las APIs de IA fallaron o están saturadas.");

      // Cortar el texto para el TTS
      const ttsText = aiResponse.slice(0, 200).trim();

      // Descargar el audio MP3
      const urlTTS = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsText)}&tl=es&client=tw-ob`;
      const ttsRes = await axios.get(urlTTS, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
      fs.writeFileSync(inputFile, Buffer.from(ttsRes.data, 'binary'));

      // Convertir a OGG/Opus (Formato de Nota de Voz de WhatsApp)
      const ffmpegCmd = `ffmpeg -y -i "${inputFile}" -c:a libopus -ac 1 -b:a 32k -ar 16000 "${outputFile}"`;
      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (error) => error ? reject(error) : resolve());
      });

      // Enviar la nota de voz
      const audioBuffer = fs.readFileSync(outputFile);
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        fileName: `iaaudio_${Date.now()}.ogg`
      }, { quoted: m });

      // Editar el mensaje con la respuesta completa escrita
      await sock.sendMessage(from, { 
        text: `✨ *Respuesta de la IA:*\n\n${aiResponse}\n\n${config.footer}`, 
        edit: waitMsg.key 
      });
      
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en IA Audio:", e.message);
      await sock.sendMessage(from, { 
        text: `⚠️ Error al generar el audio.\n_${e.message}_`, 
        edit: waitMsg.key 
      }).catch(() => {});
    } finally {
      // Limpieza
      try { if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile); } catch {}
      try { if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile); } catch {}
    }
  }
};
