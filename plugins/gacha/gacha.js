import fs from "fs";

const FILE_PATH = "./lib/characters.json";
const rollLocks = new Map();

// ═══════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════
async function loadCharacters() {
  const raw = await fs.promises.readFile(FILE_PATH, "utf-8");
  return JSON.parse(raw);
}

async function buscarImagen(tag) {
  const query = String(tag).trim().toLowerCase().replace(/\s+/g, '_');
  const urls = [
    `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${query}`,
    `https://danbooru.donmai.us/posts.json?tags=${query}`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const json = await res.json();
      const data = Array.isArray(json) ? json : json?.post || json?.data || [];
      const valid = data.map(i => i?.file_url || i?.large_file_url || i?.image).filter(u => typeof u === "string" && u.startsWith("http"));
      if (valid.length) return valid;
    } catch (e) {}
  }
  return [];
}

function cleanOldLocks() {
  const now = Date.now();
  for (const [userId, lockTime] of rollLocks.entries()) {
    if (now - lockTime > 30000) rollLocks.delete(userId);
  }
}

// ═══════════════════════════════════════════
// PLUGIN UNIFICADO
// ═══════════════════════════════════════════
export default {
  command: [
    "gacha", "togacha", 
    "rw", "roll", "rollwaifu", 
    "claim", "c", "reclamar", 
    "harem", "waifus", "claims", 
    "wtop", "topwaifus", "waifustop", 
    "charinfo", "winfo"
  ],
  execute: async (ctx) => {
    const { sock, from, m, sender, comando, args, enviartexto, db, getTargetFromMsg } = ctx;

    // Inicializar base de datos del grupo si no existe
    if (!db.chats[from]) db.chats[from] = {};
    const chat = db.chats[from];
    chat.users ||= {};
    chat.characters ||= {};
    chat.rolls ||= {};

    // Verificar si el gacha está encendido (por defecto true si no se ha tocado)
    if (chat.gacha === false && comando !== "gacha" && comando !== "togacha") {
      return enviartexto(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n> Un *admin* puede activarlos con: *${ctx.PREFIX}gacha on*`);
    }

    // ─────────────────────────────────────────
    // 1. COMANDO: ENCENDER / APAGAR
    // ─────────────────────────────────────────
    if (comando === "gacha" || comando === "togacha") {
      if (!ctx.isGroup) return enviartexto("⚠️ Solo en grupos.");
      const action = args[0]?.toLowerCase();
      if (action === "on" || action === "off") {
        chat.gacha = action === "on";
        return enviartexto(`✅ Gacha ${chat.gacha ? "ACTIVADO 🟢" : "DESACTIVADO 🔴"}`);
      }
      return enviartexto(`⚙️ Uso: ${ctx.PREFIX}gacha on/off`);
    }

    // ─────────────────────────────────────────
    // 2. COMANDO: TIRAR (RW / ROLL)
    // ─────────────────────────────────────────
    if (comando === "rw" || comando === "roll" || comando === "rollwaifu") {
      cleanOldLocks();
      if (rollLocks.has(sender)) return; // Evitar doble clic
      
      const me = chat.users[sender] ||= {};
      const now = Date.now();
      const cooldown = 15 * 60 * 1000; // 15 minutos

      if (me.lastRoll && now < me.lastRoll) {
        const r = Math.ceil((me.lastRoll - now) / 1000);
        return enviartexto(`ꕥ Espera *${Math.floor(r / 60)}m ${r % 60}s* para volver a tirar.`);
      }

      rollLocks.set(sender, now);

      try {
        await sock.sendMessage(from, { react: { text: "🎲", key: m.key } });
        const charactersData = await loadCharacters();
        const allChars = Object.values(charactersData).flatMap(s => s.characters || []);
        
        const selected = allChars[Math.floor(Math.random() * allChars.length)];
        const id = String(selected.id);
        const source = Object.values(charactersData).find(s => s.characters.some(c => String(c.id) === id))?.name || "Desconocido";
        
        const tags = selected.tags || [];
        const mediaList = await buscarImagen(tags[0] || selected.name);
        if (!mediaList.length) throw new Error("No se encontraron imágenes.");

        const media = mediaList[Math.floor(Math.random() * mediaList.length)];

        if (!chat.characters[id]) chat.characters[id] = {};
        const record = chat.characters[id];
        record.name = selected.name;
        record.value = selected.value || 100;
        record.expiresAt = now + 60000;
        record.reservedBy = sender;
        record.reservedUntil = now + 20000;

        const owner = record.user ? (db.users[record.user]?.nombre || record.user.split("@")[0]) : "Libre";
        
        const msg = `❀ Nombre » *${record.name}*\n⚥ Género » *${selected.gender || 'Desconocido'}*\n✰ Valor » *${record.value}*\n♡ Estado » *${owner}*\n❖ Fuente » *${source}*`;

        const sent = await sock.sendMessage(from, { image: { url: media }, caption: msg }, { quoted: m });
        
        chat.rolls[sent.key.id] = { id, name: record.name, expiresAt: record.expiresAt, reservedBy: sender, reservedUntil: record.reservedUntil };
        me.lastRoll = now + cooldown;

      } catch (e) {
        console.error(e);
        enviartexto(`❌ Error al tirar gacha: ${e.message}`);
      } finally {
        rollLocks.delete(sender);
      }
      return;
    }

    // ─────────────────────────────────────────
    // 3. COMANDO: RECLAMAR (CLAIM)
    // ─────────────────────────────────────────
    if (comando === "claim" || comando === "c" || comando === "reclamar") {
      const me = chat.users[sender] ||= {};
      const now = Date.now();
      const cooldown = 30 * 60 * 1000; // 30 min

      if (me.lastClaim && now < me.lastClaim) {
        return enviartexto(`ꕥ Espera *${Math.ceil((me.lastClaim - now) / 1000)}s* para reclamar otro personaje.`);
      }

      const quotedId = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
      if (!quotedId || !chat.rolls[quotedId]) return enviartexto("❀ Cita un personaje válido para reclamar.");

      const rollData = chat.rolls[quotedId];
      const record = chat.characters[rollData.id];
      
      if (!record) return enviartexto("ꕥ Personaje no encontrado.");
      if (record.user) return enviartexto(`ꕥ Este personaje ya fue reclamado.`);
      if (record.reservedBy !== sender && now < record.reservedUntil) return enviartexto(`ꕥ Otro usuario tiene este personaje reservado.`);

      record.user = sender;
      record.claimedAt = now;
      delete record.reservedBy;
      delete record.reservedUntil;
      me.lastClaim = now + cooldown;
      
      if (!me.characters) me.characters = [];
      if (!me.characters.includes(rollData.id)) me.characters.push(rollData.id);

      const name = db.users[sender]?.nombre || m.pushName || sender.split("@")[0];
      return enviartexto(`❀ *${record.name}* ha sido reclamado por *${name}*`);
    }

    // ─────────────────────────────────────────
    // 4. COMANDO: VER HARÉN
    // ─────────────────────────────────────────
    if (comando === "harem" || comando === "waifus" || comando === "claims") {
      const { jid: targetJid } = getTargetFromMsg(m, args);
      const userId = targetJid || sender;
      const name = db.users[userId]?.nombre || userId.split("@")[0];
      
      const targetUser = chat.users[userId];
      if (!targetUser || !targetUser.characters || targetUser.characters.length === 0) {
        return enviartexto(`ꕥ *${name}* no tiene personajes reclamados.`);
      }

      let message = `✿ *Personajes de ${name}* (${targetUser.characters.length})\n\n`;
      for (const id of targetUser.characters) {
        const c = chat.characters[id] || {};
        message += `» *${c.name || "ID:" + id}* (${c.value || 100})\n`;
      }
      await sock.sendMessage(from, { text: message.trim(), mentions: [userId] }, { quoted: m });
      return;
    }

    // ─────────────────────────────────────────
    // 5. COMANDO: TOP DE PERSONAJES
    // ─────────────────────────────────────────
    if (comando === "wtop" || comando === "topwaifus" || comando === "waifustop") {
      const characters = Object.values(chat.characters || {});
      const sorted = characters.sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 10);
      
      if (!sorted.length) return enviartexto("❀ Aún no hay personajes reclamados en este grupo.");

      let msg = "❀ *Personajes con más valor en el grupo:*\n\n";
      sorted.forEach((c, i) => {
        msg += `✰ ${i + 1} » *${c.name}* (${c.value || 100})\n`;
      });
      await enviartexto(msg.trim());
      return;
    }

    // ─────────────────────────────────────────
    // 6. COMANDO: INFO DE PERSONAJE
    // ─────────────────────────────────────────
    if (comando === "charinfo" || comando === "winfo") {
      if (!args.length) return enviartexto("❀ Especifica un nombre.");
      
      const query = args.join(" ").toLowerCase();
      const charId = Object.keys(chat.characters).find(id => (chat.characters[id].name || "").toLowerCase().includes(query));
      
      if (!charId) return enviartexto("ꕥ Personaje no encontrado en este grupo.");
      const record = chat.characters[charId];
      const owner = record.user ? (db.users[record.user]?.nombre || record.user.split("@")[0]) : "Libre";

      await enviartexto(`❀ Nombre » *${record.name}*\n✰ Valor » *${record.value}*\n♡ Estado » *${owner}*`);
      return;
    }
  }
};