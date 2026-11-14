export default {
  command: ["pendejo", "elpendejo", "tonto"],
  execute: async (ctx) => {
    const { sock, from, m, isGroup, enviartexto } = ctx;

    // 1. Verificar que sea un grupo
    if (!isGroup) return enviartexto("❌ Este comando solo funciona en grupos.");

    // 2. Obtener metadatos del grupo y elegir un participante al azar
    let participants = [];
    try {
      const metadata = await sock.groupMetadata(from);
      participants = metadata.participants.map(p => p.id || p.lid).filter(Boolean);
    } catch (e) {
      console.error("Error al obtener participantes:", e);
      return enviartexto("❌ No se pudo obtener la lista de participantes.");
    }

    if (participants.length === 0) {
      return enviartexto("❌ No hay participantes en este grupo.");
    }

    const randomUser = participants[Math.floor(Math.random() * participants.length)];

    // 3. Enviar mensaje inicial (10.)
    const enviado = await sock.sendMessage(
      from,
      { text: "10." },
      { quoted: m }
    );

    const esperar = (ms) => new Promise((res) => setTimeout(res, ms));

    // 4. Animar los porcentajes
    await esperar(500);
    await sock.sendMessage(from, { edit: enviado.key, text: "50.." });

    await esperar(500);
    await sock.sendMessage(from, { edit: enviado.key, text: "90..." });

    await esperar(500);
    await sock.sendMessage(from, { edit: enviado.key, text: "100% ✯" });

    await esperar(700);

    // 5. Editar con el resultado final y mención
    await sock.sendMessage(from, {
      edit: enviado.key,
      text:
        `*🔍 Búsqueda completada...*\n\n` +
        `❖ *El pendejo oficial del grupo es:*\n` +
        `> ⸙ @${randomUser.split("@")[0]}\n\n` +
        `✐ Deja de ser tan pendejo por favor.`,
      mentions: [randomUser]
    });
  }
};