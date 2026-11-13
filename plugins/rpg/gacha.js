export default {
  command: ["rw", "roll", "gacha", "spawn"],
  execute: async (ctx) => {
    const { sock, from, m, sender, enviartexto, db, config } = ctx;

    if (!db.chats[from]) db.chats[from] = {};
    const chat = db.chats[from];

    if (chat.spawnActive) {
      return enviartexto("⚠️ Ya hay una Waifu esperando ser reclamada. Usa *" + config.prefix[0] + "c* para quedártela.");
    }

    if (!db.users[sender]) db.users[sender] = { coins: 0 };
    const user = db.users[sender];

    const cost = 500;
    if ((user.coins || 0) < cost) {
      return enviartexto(`❌ Necesitas al menos *¥${cost}* coins para invocar una Waifu.`);
    }

    user.coins -= cost;

    const waifus = [
      // Legendarias
      { name: "Zero Two", anime: "Darling in the Franxx", rarity: "Legendaria 🌟", img: "https://i.postimg.cc/1Xp2Z8Xb/zero-two.jpg" },
      { name: "Makima", anime: "Chainsaw Man", rarity: "Legendaria 🌟", img: "https://i.postimg.cc/1Xp2Z8Xb/makima.jpg" },
      { name: "Esdeath", anime: "Akame ga Kill", rarity: "Legendaria 🌟", img: "https://i.postimg.cc/1Xp2Z8Xb/esdeath.jpg" },
      // Épicas
      { name: "Marin Kitagawa", anime: "My Dress-Up Darling", rarity: "Épica 💜", img: "https://i.postimg.cc/1Xp2Z8Xb/marin.jpg" },
      { name: "Rem", anime: "Re:Zero", rarity: "Épica 💜", img: "https://i.postimg.cc/1Xp2Z8Xb/rem.jpg" },
      { name: "Nezuko", anime: "Kimetsu no Yaiba", rarity: "Épica 💜", img: "https://i.postimg.cc/1Xp2Z8Xb/nezuko.jpg" },
      // Raras
      { name: "Mikasa Ackerman", anime: "Shingeki no Kyojin", rarity: "Rara 💙", img: "https://i.postimg.cc/1Xp2Z8Xb/mikasa.jpg" },
      { name: "Hinata Hyuga", anime: "Naruto", rarity: "Rara 💙", img: "https://i.postimg.cc/1Xp2Z8Xb/hinata.jpg" },
      { name: "Asuna Yuuki", anime: "Sword Art Online", rarity: "Rara 💙", img: "https://i.postimg.cc/1Xp2Z8Xb/asuna.jpg" },
      // Comunes
      { name: "Sakura Haruno", anime: "Naruto", rarity: "Común ⚪", img: "https://i.postimg.cc/1Xp2Z8Xb/sakura.jpg" },
      { name: "Bulma", anime: "Dragon Ball", rarity: "Común ⚪", img: "https://i.postimg.cc/1Xp2Z8Xb/bulma.jpg" },
      { name: "Nami", anime: "One Piece", rarity: "Común ⚪", img: "https://i.postimg.cc/1Xp2Z8Xb/nami.jpg" }
    ];

    // Lógica de rareza
    const roll = Math.random() * 100;
    let pool = [];
    
    if (roll <= 5) pool = waifus.filter(w => w.rarity.includes("Legendaria"));
    else if (roll <= 20) pool = waifus.filter(w => w.rarity.includes("Épica"));
    else if (roll <= 50) pool = waifus.filter(w => w.rarity.includes("Rara"));
    else pool = waifus.filter(w => w.rarity.includes("Común"));

    const selected = pool[Math.floor(Math.random() * pool.length)];

    // Guardar en la DB
    chat.spawnActive = selected;
    chat.spawnTime = Date.now();

    const caption = `
✨ *¡UNA WAIFU HA APARECIDO!* ✨

┏━━━〔 🌸 𝐈𝐍𝐅𝐎 〕━━━┓
┃ 👤 *Nombre:* ${selected.name}
┃ 📺 *Anime:* ${selected.anime}
┃ ⭐ *Rareza:* ${selected.rarity}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

> ¡Sé el primero en reclamarla!
> Usa *${config.prefix[0]}c* o *${config.prefix[0]}claim*
`.trim();

    await sock.sendMessage(from, { 
      image: { url: selected.img }, 
      caption 
    }, { quoted: m });
  }
};