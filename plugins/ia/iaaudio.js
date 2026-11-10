import axios from "axios";
import fs from "fs";
import path from "path";

export default {
  command: ["iaaudio", "iaa", "vozi", "voz"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;
    const text = args.join(" ").trim();
    
    if (!text) return enviartexto(`✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\nEjemplo: ${config.prefix[0]}iaa ¿Qué es el amor?`);

    const waitMsg = await sock.sendMessage(from, { text: `⏳ *${BOT_NAME}* está pensando y generando audio...` }, { quoted: m });

    try {
      let aiResponse = null;
      const prompt = `Responde en español, de forma clara, amable y concisa (máximo 2 oraciones). Pregunta: ${text}`;

      // 🌐 API de IA de Pollinations (Gratis y no pide token)
      try {
        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { timeout: 15000 });
        if (res.data && typeof res.data === "string") aiResponse = res.data.trim();
      } catch (err) {
        console.log("Fallo Pollinations, usando respaldo...");
      }

      if (!aiResponse) throw new Error("Las APIs de IA están saturadas.");

      // Cortar el texto para el TTS (Google TTS soporta hasta ~200 letras)
      const ttsText = aiResponse.slice(0, 200).trim();

      // 🎤 Descargar el MP3 directamente de Google TTS
      const urlTTS = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsText)}&tl=es&client=tw-ob`;
      const ttsRes = await axios.get(urlTTS, { 
        responseType: 'arraybuffer', 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      
      const audioBuffer = Buffer.from(ttsRes.data, 'binary');

      // 🔊 Enviar el audio directamente como MP3 (Sin ffmpeg)
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `iaaudio_${Date.now()}.mp3`,
        ptt: false // Al no ser OGG, lo enviamos como archivo de audio normal
      }, { quoted: m });

      // 📝 Editar el mensaje con la respuesta completa
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
    }
  }
};