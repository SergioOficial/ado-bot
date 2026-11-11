import axios from "axios";

export default {
  command: ["ia", "chatgpt", "gpt"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;
    const text = args.join(" ").trim();
    if (!text) return enviartexto(`✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\nEjemplo: ${config.prefix[0]}ia ¿Qué es el amor?`);

    const waitMsg = await sock.sendMessage(from, { text: `⏳ *${BOT_NAME}* está pensando...` }, { quoted: m });

    try {
      const prompt = `Eres ${BOT_NAME}, un asistente creado por ${config.ownerName}. Responde de forma clara, creativa y útil. Pregunta: ${text}`;
      
      const res = await axios.get(`https://novita-api.darkcore.xyz/api/ia/gemini?texto=`, { timeout: 20000 });
      const responseText = res.data;

      if (!responseText || typeof responseText !== 'string') {
        throw new Error("La IA devolvió una respuesta vacía.");
      }

      await sock.sendMessage(from, { 
        text: `${responseText.trim()}\n\n${config.footer}`, 
        edit: waitMsg.key 
      });

    } catch (e) {
      await sock.sendMessage(from, { 
        text: `⚠️ Error al conectar con la IA.\n_${e.message}_`, 
        edit: waitMsg.key 
      }).catch(() => {});
    }
  }
};