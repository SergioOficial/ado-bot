export default {
  command: ["rankcoins", "baltop"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db } = ctx;

    if (!isGroup) {
      return enviartexto("⚠️ Este comando solo se puede usar en grupos.");
    }

    const ranking = Object.entries(db.users)
      .map(([id, data]) => ({ 
        id, 
        nombre: data.nombre || "Desconocido", 
        coins: data.coins || data.oro || 0 
      }))
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10);

    if (!ranking.length) {
      return enviartexto("❌ No hay jugadores registrados en el sistema.");
    }

    let txt = `🏆 *TOP 10 - USUARIOS CON MÁS COINS* 🪙\n\n`;
    
    ranking.forEach((u, i) => {
      const numero = u.id.split("@")[0];
      const esTuyo = u.id === sender ? " 👑" : "";
      txt += `*${i + 1}.* ${u.nombre} (@${numero}) — *${u.coins.toLocaleString()}*${esTuyo}\n`;
    });

    const mentions = ranking.map(u => u.id);

    await sock.sendMessage(from, { 
      text: txt.trim(), 
      mentions 
    }, { quoted: m });
  }
};