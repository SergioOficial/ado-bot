export default {
  command: ["ship", "amor"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    
    let user1 = m.pushName || "Tú";
    let user2 = args.join(" ") || config.botName;

    const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentions.length > 0) {
      user2 = `@${mentions[0].split("@")[0]}`;
    }

    const str = user1 + user2;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const porcentaje = Math.abs(hash % 101);
    
    let barra = "❤️".repeat(Math.floor(porcentaje / 10)) + "🖤".repeat(10 - Math.floor(porcentaje / 10));
    let mensaje = "";
    
    if (porcentaje > 80) mensaje = "¡Están hechos el uno para el otro! 💍";
    else if (porcentaje > 50) mensaje = "Hay buena química, ¡inténtenlo! 😏";
    else if (porcentaje > 20) mensaje = "Mejor queden como amigos... 🥶";
    else mensaje = "Huye de ahí, no es buen match. 🚩";

    await sock.sendMessage(from, {
      text: `🚢 *SHIP*\n\n👤 *${user1}*\n💞 *${user2}*\n\n[ ${barra} ] *${porcentaje}%*\n\n> ${mensaje}`,
      mentions: mentions
    }, { quoted: m });
  }
};
