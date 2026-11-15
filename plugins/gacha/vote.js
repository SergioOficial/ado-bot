import fs from "fs";

const charactersFilePath = "./lib/characters.json";

async function loadCharacters() {
  const data = await fs.promises.readFile(charactersFilePath, "utf-8");
  return JSON.parse(data);
}

function flattenCharacters(structure) {
  return Object.values(structure).flatMap(s => Array.isArray(s.characters) ? s.characters : []);
}

function getSeriesNameByCharacter(structure, characterId) {
  return Object.values(structure).find(s => 
    Array.isArray(s.characters) && s.characters.some(c => String(c.id) === String(characterId))
  )?.name || "Desconocido";
}

export default {
  command: ["vote", "votar"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db } = ctx;

    // 1. Verificar que el Gacha esté activo
    if (!db.chats[from]) db.chats[from] = {};
    const chat = db.chats[from];
    
    if (chat.gacha === false) {
      return enviartexto("ꕥ Los comandos de *Gacha* están desactivados en este grupo.");
    }

    if (!chat.users) chat.users = {};
    if (!chat.users[sender]) chat.users[sender] = {};
    const me = chat.users[sender];

    if (!db.users[sender]) db.users[sender] = {};
    const globalUser = db.users[sender];

    if (!db.characters) db.characters = {};

    const now = Date.now();
    const cooldown = 1 * 60 * 60 * 1000; // 1 hora de espera por usuario

    // 2. Verificar cooldown del usuario
    if (globalUser.lastVote && now < globalUser.lastVote) {
      const timeLeft = Math.ceil((globalUser.lastVote - now) / 1000);
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      const seconds = timeLeft % 60;
      
      let timeText = "";
      if (hours > 0) timeText += `${hours}h `;
      if (minutes > 0) timeText += `${minutes}m `;
      if (seconds > 0 || timeText === "") timeText += `${seconds}s`;

      return enviartexto(`ꕥ Debes esperar *${timeText.trim()}* para usar *${ctx.PREFIX}vote* de nuevo.`);
    }

    // 3. Obtener el nombre del personaje
    const name = args.join(" ").trim();
    if (!name) return enviartexto(`❀ Debes especificar un personaje para votarlo.\n> Ejemplo: ${ctx.PREFIX}vote Yuki Suou`);

    // 4. Buscar el personaje en el JSON
    let character = null;
    let source = "Desconocido";
    try {
      const structure = await loadCharacters();
      const allCharacters = flattenCharacters(structure);
      
      character = allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (character) {
        source = getSeriesNameByCharacter(structure, character.id);
      }
    } catch (e) {
      console.error("Error al cargar characters.json:", e);
      return enviartexto("❌ Error interno: No se pudo cargar la base de datos de personajes.");
    }

    if (!character) {
      return enviartexto(`ꕥ Personaje no encontrado. Asegúrate de que el nombre esté bien escrito.`);
    }

    // 5. Inicializar récord global del personaje si no existe
    if (!db.characters[character.id]) {
      db.characters[character.id] = {};
    }
    const record = db.characters[character.id];
    
    if (!record.name) record.name = character.name;
    if (typeof record.value !== "number") record.value = Number(character.value || 0);
    if (typeof record.votes !== "number") record.votes = 0;

    // 6. Verificar cooldown del personaje (1 hora)
    if (record.lastVotedAt && now < record.lastVotedAt + cooldown) {
      const remaining = record.lastVotedAt + cooldown - now;
      const totalSec = Math.ceil(remaining / 1000);
      const h = Math.floor(totalSec / 3600);
      const m_ = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      
      let timeText = "";
      if (h > 0) timeText += `${h}h `;
      if (m_ > 0) timeText += `${m_}m `;
      if (s > 0 || timeText === "") timeText += `${s}s`;

      return enviartexto(`ꕥ *${record.name}* ha sido votada recientemente.\n> Debes esperar *${timeText.trim()}* para votarla de nuevo.`);
    }

    // 7. Límite diario de puntos por personaje (900 puntos)
    if (!record.dailyIncrement) record.dailyIncrement = {};
    const today = new Date().toISOString().slice(0, 10);
    const currentValue = record.dailyIncrement[today] || 0;

    if (currentValue >= 900) {
      return enviartexto(`ꕥ El personaje *${record.name}* ya tiene el valor máximo diario (900 puntos).`);
    }

    // 8. Calcular incremento aleatorio (50 a 250 puntos)
    const increment = Math.min(900 - currentValue, Math.floor(Math.random() * 201) + 50);
    
    // 9. Guardar los nuevos valores
    record.value = (record.value || 0) + increment;
    record.votes += 1;
    record.lastVotedAt = now;
    record.dailyIncrement[today] = currentValue + increment;

    // 10. Aplicar cooldown al usuario
    globalUser.lastVote = now + cooldown;

    // 11. Enviar mensaje de éxito
    await enviartexto(
      `❀ Votaste por *${record.name}* (*${source}*)\n` +
      `> Su nuevo valor es *${record.value.toLocaleString()}* (+${increment})\n` +
      `> Votos totales: *${record.votes}*`
    );
  }
};