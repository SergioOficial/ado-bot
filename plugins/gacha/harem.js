/**
 * plugins/gacha/harem.js — `.harem` · `.waifus` · `.claims`
 *
 * La lista de personajes reclamados por alguien, del más valioso al más pobre y
 * por páginas. Sin mención mira el tuyo; con mención (o con un número) mira el
 * de esa persona.
 *
 * 30 por página, no 60: con nombre y valor cada renglón ocupa unos 40
 * caracteres, y WhatsApp corta los mensajes largos. Mejor tres páginas que un
 * mensaje truncado justo donde ya no se sabe qué personajes hay.
 */

import { chatDeGacha, gachaApagado, miles } from "../../lib/gacha.js";

const POR_PAGINA = 30;

export default {
  command: ["harem", "waifus", "claims"],

  execute: async (ctx) => {
    const { from, sender, args, enviartexto, db, getTargetFromMsg, PREFIX } = ctx;

    const chat = chatDeGacha(db, from);
    if (gachaApagado(chat)) {
      return enviartexto(
        `ꕥ Los comandos de *Gacha* están apagados en este chat.\n> Un administrador los enciende con *${PREFIX}gacha on*`
      );
    }

    const { jid } = getTargetFromMsg(ctx.m, args) || {};
    const quien = jid || sender;
    const nombre = nombreDe(db, quien);

    const ids = chat.users[quien]?.characters || [];
    if (!ids.length) {
      return enviartexto(
        quien === sender
          ? `ꕥ Todavía no tienes personajes reclamados.\n> Tira uno con *${PREFIX}rw* y reclámalo con *${PREFIX}claim*.`
          : `ꕥ *${nombre}* no tiene personajes reclamados.`
      );
    }

    // Ordenados por valor, que es lo que se mira.
    const lista = ids
      .map((id) => ({ id, ficha: chat.characters[id] }))
      .filter((c) => c.ficha)
      .sort((a, b) => (Number(b.ficha.value) || 0) - (Number(a.ficha.value) || 0));

    if (!lista.length) return enviartexto(`ꕥ *${nombre}* no tiene personajes reclamados.`);

    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    const pagina = Math.min(paginas, Math.max(1, Number.parseInt(numeroSuelto(args), 10) || 1));
    const desde = (pagina - 1) * POR_PAGINA;
    const recorte = lista.slice(desde, desde + POR_PAGINA);

    let texto = `✿ *Personajes de ${nombre}*\n`;
    texto += `♡ Total » *${lista.length}*\n\n`;

    recorte.forEach((c, i) => {
      texto += `✰ ${desde + i + 1} » *${c.ficha.name || "ID:" + c.id}* (${miles(c.ficha.value)})\n`;
    });

    texto += `\n⌦ Página *${pagina}* de *${paginas}*`;
    if (pagina < paginas) {
      texto += `\n> Siguiente: *${PREFIX}harem ${quien === sender ? "" : "@" + nombre + " "}${pagina + 1}*`;
    }

    return ctx.sock.sendMessage(from, { text: texto, mentions: [quien] }, { quoted: ctx.m });
  },
};

/** El último argumento que sea número: es la página. */
function numeroSuelto(args = []) {
  for (let i = args.length - 1; i >= 0; i--) {
    const n = Number.parseInt(args[i], 10);
    if (Number.isFinite(n) && String(args[i]).length <= 3) return n;
  }
  return 1;
}

function nombreDe(db, jid) {
  const u = db.users?.[jid];
  return u?.nombre || u?.name || String(jid || "").split("@")[0];
}
