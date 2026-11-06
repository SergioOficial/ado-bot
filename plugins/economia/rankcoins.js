export default {
  command: ["rankcoins"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db } = ctx;
    if (isGroup) {
      const meta = await sock.groupMetadata(from);
      if (!meta.participants.filter(p => p.admin).map(p => p.id).includes(sender)) return enviartexto("⚠️ Solo administradores del grupo.");
    }
    const ranking = Object.entries(db.users).map(([id, data]) => ({ id, nombre: data.nombre || "Desconocido", coins: data.coins || data.oro || 0 })).sort((a, b) => b.coins - a.coins).slice(0, 10);
    if (!ranking.length) return enviartexto("❌ No hay jugadores.");
    let txt = `🏆 *TOP 10 COINS* 🪙\n\n`;
    ranking.forEach((u, i) => { txt += `*${i + 1}.* ${u.nombre} (${u.id.split("@")[0]}) — *${u.coins}*${u.id === sender ? " 👑" : ""}\n`; });
    await sock.sendMessage(from, { text: txt, mentions: [sender] }, { quoted: m });
  }
};
