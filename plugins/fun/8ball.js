export default {
  command: ["8ball", "bola"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const pregunta = args.join(" ").trim();
    if (!pregunta) return enviartexto(`🎱 Uso: ${config.prefix}8ball <tu pregunta>`);

    const respuestas = [
      "Sí, definitivamente. ✅",
      "No lo creo. ❌",
      "Pregunta de nuevo más tarde. ⏳",
      "No puedo predecirlo ahora. 🤔",
      "Mis fuentes dicen que no. 📉",
      "Las perspectivas no son buenas. 🌧️",
      "Sin duda alguna. ✨",
      "Sí, pero con cuidado. ⚠️",
      "Muy dudoso. 🚩",
      "Los astros dicen que sí. 🌟"
    ];

    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];

    await sock.sendMessage(from, {
      text: `🎱 *La Bola Mágica dice...*\n\n> *Pregunta:* ${pregunta}\n> *Respuesta:* ${respuesta}`
    }, { quoted: m });
  }
};
