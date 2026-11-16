import axios from "axios";

export default {
  command: ["chatgpt", "ia", "geminis", "ai"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;
    const text = args.join(" ").trim();

    if (!text) return enviartexto(`✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\nEjemplo: ${config.prefix[0]}ia ¿Qué es el amor?`);

    const waitMsg = await sock.sendMessage(from, { text: `❀  *${BOT_NAME}* está pensando...` }, { quoted: m });

    try {
      let aiResponse = null;
      const prompt = `Responde en el idioma que te escriban, de forma clara, actua como la waifu ado. Pregunta: ${text}`;

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
      // 3. Editar el mensaje con la respuesta completa
      await sock.sendMessage(from, { 
        text: `✨ *Respuesta de la IA:*\n\n${aiResponse}\n\n${config.footer}`, 
        edit: waitMsg.key 
      });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en IA :", e.message);
      await sock.sendMessage(from, { 
        text: `⚠️ Error al generar respuesta.\n_${e.message}_`, 
        edit: waitMsg.key 
      }).catch(() => {});
    }
  }
};