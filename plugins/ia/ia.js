export default {
  command: ["ia", "chatgpt", "gpt"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;
    const text = args.join(" ").trim();
    if (!text) return enviartexto(`✧ *${BOT_NAME}* ✧\n\nEscribe una petición.\nEjemplo: ${config.prefix}ia ¿Qué es el amor?`);
    const username = m.pushName || "Usuario";
    const basePrompt = `Eres Levi-Bot. Responde claro y creativo. Pregunta: ${text}`;
    const waitMsg = await sock.sendMessage(from, { text: `⏳ *${BOT_NAME}* está pensando...` }, { quoted: m });
    try {
      let res = await fetch("https://ai.siputzx.my.id", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, user: username, prompt: basePrompt, webSearchMode: false }) });
      let json = await res.json();
      let responseText = json?.result;
      if (!responseText) {
        res = await fetch(`https://api.stellarwa.xyz/ai/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(basePrompt)}&key=YukiWaBot`);
        json = await res.json();
        responseText = json?.result?.text || json?.result || json?.results;
      }
      if (!responseText) return sock.sendMessage(from, { text: "❌ No se pudo obtener respuesta.", edit: waitMsg.key });
      await sock.sendMessage(from, { text: `${responseText.trim()}\n\n${config.footer}`, edit: waitMsg.key });
    } catch (e) { await sock.sendMessage(from, { text: `⚠️ Error: ${e.message}`, edit: waitMsg.key }); }
  }
};
