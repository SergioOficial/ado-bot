export default {
  command: ["ranknivel", "lvltop"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db, jidToNumber } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo se puede usar en grupos.");

    const uniqueUsers = new Map();

    for (const [id, data] of Object.entries(db.users)) {
      const num = jidToNumber(id);
      const currentLevel = data.nivel || 1;
      const currentExp = data.exp || 0;

      if (!uniqueUsers.has(num) || currentLevel > (uniqueUsers.get(num).nivel || 0) || (currentLevel === uniqueUsers.get(num).nivel && currentExp > uniqueUsers.get(num).exp)) {
        uniqueUsers.set(num, { 
          id: num + "@s.whatsapp.net", 
          nombre: data.nombre || "Desconocido", 
          nivel: currentLevel, 
          exp: currentExp, 
          clase: data.clase || "Novato" 
        });
      }
    }

    const ranking = Array.from(uniqueUsers.values())
      .sort((a, b) => b.nivel === a.nivel ? b.exp - a.exp : b.nivel - a.nivel)
      .slice(0, 10);

    if (!ranking.length) return enviartexto("❌ No hay jugadores registrados en el sistema.");

    let txt = `⚔️ *TOP 10 - JUGADORES CON MÁS NIVEL* 💫\n\n`;
    
    ranking.forEach((u, i) => {
      const numero = u.id.split("@")[0];
      const esTuyo = u.id === sender ? " 👑" : "";
      txt += `*${i + 1}.* ${u.nombre} (@${numero}) — *Nivel ${u.nivel}* [${u.clase}]${esTuyo}\n`;
    });

    await sock.sendMessage(from, { text: txt.trim(), mentions: ranking.map(u => u.id) }, { quoted: m });
  }
};