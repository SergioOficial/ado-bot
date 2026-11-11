export default {
  command: ["ranknivel", "lvltop"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db } = ctx;

    if (!isGroup) {
      return enviartexto("⚠️ Este comando solo se puede usar en grupos.");
    }

    const ranking = Object.entries(db.users)
      .map(([id, d]) => ({ 
        id, 
        nombre: d.nombre || "Desconocido", 
        nivel: d.nivel || 1, 
        exp: d.exp || 0, 
        clase: d.clase || "Novato" 
      }))
      .sort((a, b) => b.nivel === a.nivel ? b.exp - a.exp : b.nivel - a.nivel)
      .slice(0, 10);

    if (!ranking.length) {
      return enviartexto("❌ No hay jugadores registrados en el sistema.");
    }

    let txt = `⚔️ *TOP 10 - JUGADORES CON MÁS NIVEL* 💫\n\n`;
    
    ranking.forEach((u, i) => {
      const numero = u.id.split("@")[0];
      const esTuyo = u.id === sender ? " 👑" : "";
      txt += `*${i + 1}.* ${u.nombre} (@${numero}) — *Nivel ${u.nivel}* [${u.clase}]${esTuyo}\n`;
    });

    const mentions = ranking.map(u => u.id);

    await sock.sendMessage(from, { 
      text: txt.trim(), 
      mentions 
    }, { quoted: m });
  }
};