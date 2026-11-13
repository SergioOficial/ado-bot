export default {
  command: ["animal", "mascotas", "animaltop"],
  execute: async (ctx) => {
    const { sender, comando, isGroup, enviartexto, db, config } = ctx;

    if (comando === "animal" || comando === "mascotas") {
      if (!db.users[sender] || !db.users[sender].pets || Object.keys(db.users[sender].pets).length === 0) {
        return enviartexto("❌ No tienes mascotas. Usa *.adoptar <animal>* para conseguir una.");
      }

      const pets = db.users[sender].pets;
      let txt = `🐾 *TUS MASCOTAS*\n\n`;
      
      for (const [key, p] of Object.entries(pets)) {
        txt += `┏━━━〔 ${p.name} 〕━━━┓\n`;
        txt += `┃ 🦊 *Especie:* ${key}\n`;
        txt += `┃ 📈 *Nivel:* ${p.level}/50\n`;
        txt += `┃ ✨ *Puntos:* ${p.points}/${p.level * 100}\n`;
        txt += `┗━━━━━━━━━━━━━━━━━━┛\n`;
      }
      return enviartexto(txt.trim());
    }

    if (comando === "animaltop") {
      if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");
      
      const allPets = [];
      for (const [uid, u] of Object.entries(db.users)) {
        if (u.pets) {
          for (const [species, p] of Object.entries(u.pets)) {
            allPets.push({ 
              owner: uid.split("@")[0], 
              name: p.name, 
              species, 
              level: p.level, 
              points: p.points 
            });
          }
        }
      }

      if (allPets.length === 0) return enviartexto("❌ No hay mascotas registradas en el sistema.");

      allPets.sort((a, b) => b.level === a.level ? b.points - a.points : b.level - a.level);
      const top10 = allPets.slice(0, 10);

      let txt = `🏆 *TOP 10 - MASCOTAS MÁS FUERTES* 🐾\n\n`;
      top10.forEach((p, i) => {
        txt += `*${i + 1}.* ${p.name} (${p.species}) — Nv.${p.level} [${p.points} pts]\n`;
        txt += `   👤 Dueño: ${p.owner}\n\n`;
      });

      return enviartexto(txt.trim());
    }
  }
};