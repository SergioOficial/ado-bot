export default {
  command: ["imagen", "flux", "dalle"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const prompt = args.join(" ").trim();
    
    if (!prompt) return enviartexto(`🎨 Uso: ${config.prefix}imagen <descripción de la imagen>\nEjemplo: ${config.prefix}imagen un gato astronauta`);

    await sock.sendMessage(from, { react: { text: "🎨", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `⏳ *Generando imagen...*\n_Prompt: ${prompt}_` }, { quoted: m });

    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
      
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: `✨ *Imagen generada*\n\n> *Prompt:* ${prompt}\n${config.footer}`
      }, { quoted: m });

      await sock.sendMessage(from, { delete: waitMsg.key }).catch(() => {});
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (error) {
      console.error("Error en imagen IA:", error);
      await sock.sendMessage(from, { text: `❌ Error al generar la imagen. Intenta de nuevo.`, edit: waitMsg.key }).catch(() => {});
    }
  }
};
