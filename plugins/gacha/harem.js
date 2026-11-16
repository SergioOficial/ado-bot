/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { chatDeGacha, gachaApagado, cargarPersonajes, serieDe, miles } from "../../lib/gacha.js";

export default {
  command: ["harem", "waifus", "claims"],
  execute: async (ctx) => {
    const { sock, from, m, args, sender, enviartexto, db, PREFIX, getTargetFromMsg } = ctx;
    const chat = chatDeGacha(db, from);
    if (gachaApagado(chat)) {
      return enviartexto(`ꕥ Los comandos de *Gacha* están apagados en este chat.\n> Un administrador los enciende con *${PREFIX}gacha on*`);
    }
    const userId = getTargetFromMsg?.(m, args)?.jid || sender;
    const name = db.users?.[userId]?.nombre || (userId === sender ? m.pushName : null) || userId.split("@")[0];
    const personajes = chat.users[userId]?.characters;
    if (!Array.isArray(personajes) || personajes.length === 0) {
      return enviartexto(`ꕥ *${name}* no tiene personajes reclamados.`);
    }
    const catalogo = await cargarPersonajes();
    let texto = `✿ *Personajes de ${name}*\n♡ Total » *${miles(personajes.length)}*\n\n`;
    for (const [indice, id] of personajes.slice(0, 20).entries()) {
      const local = chat.characters[id] || {};
      const global = db.characters?.[id] || {};
      const valor = typeof global.value === "number" ? global.value : typeof local.value === "number" ? local.value : 100;
      const serie = serieDe(catalogo, id);
      const extra = serie !== "Desconocido" ? ` — _${serie}_` : "";
      texto += `✰ ${indice + 1} » *${global.name || local.name || "Desconocido"}* (${miles(valor)})${extra}\n`;
    }
    if (personajes.length > 20) texto += `\n⌦ _Mostrando los primeros 20 de ${miles(personajes.length)}_`;
    await sock.sendMessage(from, { text: texto.trim(), mentions: [userId] }, { quoted: m });
  },
};
