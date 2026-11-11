export default {
  command: ["rankcoins", "baltop"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db, jidToNumber } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo se puede usar en grupos.");

    const uniqueUsers = new Map();

    for (const [id, data] of Object.entries(db.users)) {
      const num = jidToNumber(id);
      const currentCoins = data.coins || data.oro || 0;
      
      if (!uniqueUsers.has(num) || currentCoins > (uniqueUsers.get(num).coins || 0)) {
        uniqueUsers.set(num, { 
          id: num + "@s.whatsapp.net", 
          nombre: data.nombre || "Desconocido", 
          coins: currentCoins 
        });
      }
    }

    const ranking = Array.from(uniqueUsers.values())
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10);

    if (!ranking.length) return enviartexto("❌ No hay jugadores registrados en el sistema.");

    let txt = `🏆 *TOP 10 - USUARIOS CON MÁS COINS* 🪙\n\n`;
    
    ranking.forEach((u, i) => {
      const numero = u.id.split("@")[0];
      const esTuyo = u.id === sender ? " 👑" : "";
      txt += `*${i + 1}.* ${u.nombre} (@${numero}) — *${u.coins.toLocaleString()}*${esTuyo}\n`;
    });

    await sock.sendMessage(from, { text: txt.trim(), mentions: ranking.map(u => u.id) }, { quoted: m });
  }
};