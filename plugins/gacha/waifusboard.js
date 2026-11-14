/**
 * plugins/gacha/waifusboard.js — `.wtop` · `.topwaifus` · `.waifustop` · `.waifusboard`
 *
 * El ranking del chat: los personajes reclamados con más valor, de mayor a
 * menor, de diez en diez.
 *
 * Cuenta lo que hay **en este grupo**, no el catálogo entero. Un top del
 * catálogo tendría siempre los mismos nombres (los que más valor traen en el
 * JSON) y no diría nada de quién está jugando; aquí sale lo que de verdad se ha
 * reclamado y cuánto suma cada uno.
 */

import { chatDeGacha, gachaApagado, miles } from "../../lib/gacha.js";

const POR_PAGINA = 10;

export default {
  command: ["wtop", "topwaifus", "waifustop", "waifusboard"],

  execute: async (ctx) => {
    const { from, args, enviartexto, db, PREFIX } = ctx;

    const chat = chatDeGacha(db, from);
    if (gachaApagado(chat)) {
      return enviartexto(
        `ꕥ Los comandos de *Gacha* están apagados en este chat.\n> Un administrador los enciende con *${PREFIX}gacha on*`
      );
    }

    const reclamados = Object.entries(chat.characters || {})
      .map(([id, ficha]) => ({ id, ...ficha }))
      .filter((c) => c.user)
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

    if (!reclamados.length) {
      return enviartexto(`❀ Nadie ha reclamado nada todavía en este chat.\n> Empieza con *${PREFIX}rw*.`);
    }

    const paginas = Math.max(1, Math.ceil(reclamados.length / POR_PAGINA));
    const pagina = Math.min(paginas, Math.max(1, Number.parseInt(args[0], 10) || 1));
    const desde = (pagina - 1) * POR_PAGINA;
    const recorte = reclamados.slice(desde, desde + POR_PAGINA);

    let texto = "🏆 *Personajes con más valor del grupo*\n\n";
    recorte.forEach((c, i) => {
      const dueño = nombreDe(db, c.user);
      texto += `✰ ${desde + i + 1} » *${c.name || "ID:" + c.id}*\n`;
      texto += `   → ${miles(c.value)} · *${dueño}*\n`;
    });

    const suma = reclamados.reduce((n, c) => n + (Number(c.value) || 0), 0);
    texto += `\n⌦ Página *${pagina}* de *${paginas}* · Total reclamado » *${miles(suma)}*`;
    if (pagina < paginas) texto += `\n> Siguiente: *${PREFIX}wtop ${pagina + 1}*`;

    return enviartexto(texto.trim());
  },
};

function nombreDe(db, jid) {
  const u = db.users?.[jid];
  return u?.nombre || u?.name || String(jid || "").split("@")[0];
}
