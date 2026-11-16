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

  const total = targetUser.characters.length;
  const LIMITE = 20;
  const mostrados = targetUser.characters.slice(0, LIMITE);

  // Catálogo estático (ya cacheado en gacha.js) para poder mostrar la serie
  const catalogo = await cargarPersonajes();

  let message = `✿ *Personajes de ${name}*\n♡ Total » *${miles(total)}*\n\n`;

  for (let i = 0; i < mostrados.length; i++) {
    const id = mostrados[i];
    const localC = chat.characters[id] || {};
    const globalC = db.characters?.[id] || {};

    // El valor global (votado) manda; si no hay, el local; si no, 100
    const finalValue =
      typeof globalC.value === "number"
        ? globalC.value
        : typeof localC.value === "number"
        ? localC.value
        : 100;

    const charName = globalC.name || localC.name || "Desconocido";
    const serie = serieDe(catalogo, id);
    const extra = serie && serie !== "Desconocido" ? ` — _${serie}_` : "";

    message += `✰ ${i + 1} » *${charName}* (${miles(finalValue)})${extra}\n`;
  }

  if (total > LIMITE) {
    message += `\n⌦ _Mostrando los primeros ${LIMITE} de ${miles(total)}_`;
  }

  await sock.sendMessage(from, { text: message.trim(), mentions: [userId] }, { quoted: m });
  return;
}