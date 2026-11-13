export default {
  command: ["waifus", "harem", "miswaifus"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;

    if (!db.users[sender] || !db.users[sender].waifus || db.users[sender].waifus.length === 0) {
      return enviartexto(`❌ Tu harem está vacío. Usa *${config.prefix[0]}rw* en el grupo y reclama rápido con *${config.prefix[0]}c*.`);
    }

    const waifus = db.users[sender].waifus;
    let txt = `🌸 *HAREM DE @${sender.split("@")[0]}*\n\n`;

    // Agrupar por rareza
    const legendarias = waifus.filter(w => w.rarity.includes("Legendaria"));
    const epicas = waifus.filter(w => w.rarity.includes("Épica"));
    const raras = waifus.filter(w => w.rarity.includes("Rara"));
    const comunes = waifus.filter(w => w.rarity.includes("Común"));

    if (legendarias.length) {
      txt += `🌟 *LEGENDARIAS (${legendarias.length}):*\n`;
      legendarias.forEach(w => txt += `  ➤ ${w.name} [${w.anime}]\n`);
      txt += "\n";
    }
    if (epicas.length) {
      txt += `💜 *ÉPICAS (${epicas.length}):*\n`;
      epicas.forEach(w => txt += `  ➤ ${w.name} [${w.anime}]\n`);
      txt += "\n";
    }
    if (raras.length) {
      txt += `💙 *RARAS (${raras.length}):*\n`;
      raras.forEach(w => txt += `  ➤ ${w.name} [${w.anime}]\n`);
      txt += "\n";
    }
    if (comunes.length) {
      txt += `⚪ *COMUNES (${comunes.length}):*\n`;
      comunes.forEach(w => txt += `  ➤ ${w.name} [${w.anime}]\n`);
      txt += "\n";
    }

    txt += `> Total en el harem: *${waifus.length}*`;

    await enviartexto(txt.trim());
  }
};