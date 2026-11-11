import axios from "axios";

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

      // 1. Intentar con Novita (la misma de .ia)
      try {
        const novitaUrl = `https://novita-api.darkcore.xyz/api/ia/gemini?texto=${encodeURIComponent(prompt)}`;
        const res = await axios.get(novitaUrl, { timeout: 15000 });
        let data = res.data;
        
        if (typeof data === 'object' && data !== null) {
          data = data.result || data.texto || data.response || data.data;
        }
        if (data && typeof data === 'string') aiResponse = data.trim();
      } catch (err) {
        console.log("Fallo Novita IA, usando Pollinations de respaldo...");
      }

      // 2. Respaldo: Pollinations
      if (!aiResponse) {
        try {
          const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { timeout: 15000 });
          if (res.data && typeof res.data === "string") aiResponse = res.data.trim();
        } catch (err) {
          console.log("Fallo Pollinations también.");
        }
      }

      if (!aiResponse) throw new Error("Las APIs de IA están saturadas, intenta más tarde.");

      // Cortar el texto para el TTS (Google soporta ~200 letras)
      const ttsText = aiResponse.slice(0, 200).trim();

      // 3. Descargar el MP3 de Google TTS
      const urlTTS = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsText)}&tl=es&client=tw-ob`;
      const ttsRes = await axios.get(urlTTS, { 
        responseType: 'arraybuffer', 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });

      // 👇 FIX: Conversión limpia de ArrayBuffer a Buffer
      const audioBuffer = Buffer.from(ttsRes.data);

      // 4. Enviar el audio (Sin ffmpeg, como MP3)
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `iaaudio_${Date.now()}.mp3`,
        ptt: false
      }, { quoted: m });

      // 5. Editar el mensaje con la respuesta completa
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