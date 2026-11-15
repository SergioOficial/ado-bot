// ─────────────────────────────────────────
// 4. COMANDO: VER HARÉN (CLAIMS)
// ─────────────────────────────────────────
if (comando === "harem" || comando === "waifus" || comando === "claims") {
  const { jid: targetJid } = getTargetFromMsg(m, args);
  const userId = targetJid || sender;
  const name = db.users[userId]?.nombre || m.pushName || userId.split("@")[0];
  
  const targetUser = chat.users[userId];
  if (!targetUser || !targetUser.characters || targetUser.characters.length === 0) {
    return enviartexto(`ꕥ *${name}* no tiene personajes reclamados.`);
  }

  let message = `✿ *Personajes de ${name}*\n♡ Total » *${targetUser.characters.length}*\n\n`;
  
  for (let i = 0; i < targetUser.characters.length; i++) {
    const id = targetUser.characters[i];
    const localC = chat.characters[id] || {};
    const globalC = db.characters?.[id] || {}; 
    
    // 👇 AQUÍ ESTÁ EL FIX: Leer el valor global (votado) primero, luego el local, luego 100
    const finalValue = typeof globalC.value === 'number' ? globalC.value : (typeof localC.value === 'number' ? localC.value : 100);
    const charName = globalC.name || localC.name || "Desconocido";
    
    message += `✰ ${i + 1} » *${charName}* (${finalValue})\n`;
  }
  
  // Añadimos un mini sistema de paginación por si el usuario tiene muchos personajes (más de 20)
  if (targetUser.characters.length > 20) {
    message += `\n⌦ _Mostrando los primeros 20_`;
  }

  await sock.sendMessage(from, { text: message.trim(), mentions: [userId] }, { quoted: m });
  return;
}