export default {
  command: ["c", "claim", "reclamar"],
  execute: async (ctx) => {
    const { sock, from, m, sender, enviartexto, db, config } = ctx;

    if (!db.chats[from] || !db.chats[from].spawnActive) {
      return enviartexto("❌ No hay ninguna Waifu para reclamar en este momento. Usa *" + config.prefix[0] + "rw* para invocar una.");
    }

    const waifu = db.chats[from].spawnActive;

    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];
    if (!user.waifus) user.waifus = [];

    // Verificar si ya la tiene
    if (user.waifus.some(w => w.name === waifu.name)) {
      return enviartexto(`⚠️ Ya tienes a *${waifu.name}* en tu harem.`);
    }

    // Reclamar
    user.waifus.push(waifu);
    
    // Limpiar el spawn
    delete db.chats[from].spawnActive;
    delete db.chats[from].spawnTime;

    await sock.sendMessage(from, { 
      text: `💖 *¡RECLAMADA!*\n\n@${sender.split("@")[0]} se ha quedado con *${waifu.name}* (${waifu.rarity}).\n\n> Usa *${config.prefix[0]}waifus* para ver tu harem.`,
      mentions: [sender]
    }, { quoted: m });
  }
};