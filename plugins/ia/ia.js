import axios from "axios";

export default {
  command: ["ia", "chatgpt", "gpt"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;
    const text = args.join(" ").trim();
    
    if (!text) return enviartexto(`✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\nEjemplo: ${config.prefix[0]}ia ¿Qué es el amor?`);

    const waitMsg = await sock.sendMessage(from, { text: `⏳ *${BOT_NAME}* está pensando...` }, { quoted: m });

    try {
      // 🌐 Endpoint de Evogb
      const evogbUrl = `https://evogb.win/api/ai/gemini?text=${encodeURIComponent(text)}`;
      
      const res = await axios.get(evogbUrl, { timeout: 25000 });
      const data = res.data;

      // 🕵️‍♂️ Extracción robusta de la respuesta de texto
      const responseText = 
        data.result || 
        data.text || 
        data.response || 
        data.message || 
        data.data?.text || 
        data.data;

      if (!responseText || typeof responseText !== 'string') {
        throw new Error("La IA devolvió una respuesta vacía o inválida.");
      }

      await sock.sendMessage(from, { 
        text: `${responseText.trim()}\n\n${config.footer}`, 
        edit: waitMsg.key 
      });

    } catch (e) {
      console.error("Error en IA (Evogb):", e.message);
      await sock.sendMessage(from, { text: `⚠️ Error al conectar con la IA.\n_${e.message}_`, edit: waitMsg.key }).catch(() => {});
    }
  }
};