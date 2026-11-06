export default {
  command: ["ranknivel"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db } = ctx;
    if (isGroup) {
      const meta = await sock.groupMetadata(from);
      if (!meta.participants.filter(p => p.admin).map(p => p.id).includes(sender)) return enviartexto("⚠️ Solo administradores del grupo.");
    }
    const ranking = Object.entries(db.users).map(([id, d]) => ({ id, nombre: d.nombre || "Desconocido", nivel: d.nivel || 1, exp: d.exp || 0, clase: d.clase || "Novato" })).sort((a, b) => b.nivel === a.nivel ? b.exp - a.exp : b.nivel - a.nivel).slice(0, 10);
    if (!ranking.length) return enviartexto("❌ No hay jugadores.");
    let txt = `⚔️ *TOP 10 NIVEL* 💫\n\n`;
    ranking.forEach((u, i) => { txt += `*${i + 1}.* ${u.nombre} (${u.id.split("@")[0]}) — Nv.${u.nivel} [${u.clase}]${u.id === sender ? " 👑" : ""}\n`; });
    await sock.sendMessage(from, { text: txt, mentions: [sender] }, { quoted: m });
  }
};
