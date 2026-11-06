export default {
  command: ["qr", "qrcode"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const text = args.join(" ").trim();

    if (!text) return enviartexto(`📱 Uso: ${config.prefix}qr <texto o enlace>`);

    await sock.sendMessage(from, { react: { text: "📱", key: m.key } });

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=512x512&margin=10`;
      
      await sock.sendMessage(from, {
        image: { url: qrUrl },
        caption: `📱 *Código QR generado*\n\n> *Contenido:* ${text}`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await enviartexto("❌ Error al generar el código QR.");
    }
  }
};
