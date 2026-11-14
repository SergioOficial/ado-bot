/**
 * plugins/gacha/claim.js — `.claim` · `.c` · `.reclamar`
 *
 * Se lleva el personaje que alguien tiró con `.rw`. Hay dos formas de decir
 * cuál:
 *
 *   · citando el mensaje del personaje (lo de siempre)
 *   · escribiendo el comando a secas, y entonces se toma **el último tiro del
 *     chat** si todavía está vivo
 *
 * La segunda existe porque la gente cita mal (o contesta sin citar) y antes se
 * quedaba con un «cita un personaje válido» después de ver la foto. También es
 * lo que hace que el comando funcione pulsado desde un botón.
 */

import { chatDeGacha, gachaApagado, restante, miles } from "../../lib/gacha.js";

/** Espera entre reclamos del mismo usuario. */
const ESPERA = 30 * 60 * 1000;

export default {
  command: ["claim", "c", "reclamar"],

  execute: async (ctx) => {
    const { from, m, sender, enviartexto, db, PREFIX } = ctx;

    const chat = chatDeGacha(db, from);
    if (gachaApagado(chat)) {
      return enviartexto(
        `ꕥ Los comandos de *Gacha* están apagados en este chat.\n> Un administrador los enciende con *${PREFIX}gacha on*`
      );
    }

    const ahora = Date.now();

    const mio = (chat.users[sender] ||= {});
    if (mio.lastClaim && ahora < mio.lastClaim) {
      return enviartexto(`ꕥ Espera *${restante(mio.lastClaim - ahora)}* para reclamar otro personaje.`);
    }

    // 1. ¿A qué personaje se refiere?
    const citado = contextoDe(m)?.stanzaId;
    const msgId = (citado && chat.rolls[citado] ? citado : null) || chat.ultimoRoll;
    const roll = msgId ? chat.rolls[msgId] : null;

    if (!roll) {
      return enviartexto(
        `❀ No hay ningún personaje esperando.\n> Tira uno con *${PREFIX}rw*.`
      );
    }

    // 2. ¿Sigue disponible?
    if (roll.expiresAt && ahora > roll.expiresAt) {
      delete chat.rolls[msgId];
      return enviartexto(
        `ꕥ Ese personaje se evaporó hace *${restante(ahora - roll.expiresAt)}*.\n> Tira otro con *${PREFIX}rw*.`
      );
    }
    if (roll.claimed) {
      const dueño = chat.characters[roll.id]?.user;
      return enviartexto(
        `ꕥ *${roll.name}* ya es de *${dueño ? nombreDe(db, dueño) : "alguien"}*.`
      );
    }
    if (roll.reservedBy && roll.reservedBy !== sender && ahora < (roll.reservedUntil || 0)) {
      return enviartexto(
        `ꕥ *${nombreDe(db, roll.reservedBy)}* lo tiene reservado *${restante(roll.reservedUntil - ahora)}* más.`
      );
    }

    const ficha = chat.characters[roll.id];
    if (!ficha) {
      delete chat.rolls[msgId];
      return enviartexto("ꕥ Ese personaje ya no está en la lista del chat. Tira otro.");
    }
    if (ficha.user) {
      return enviartexto(`ꕥ *${ficha.name}* ya es de *${nombreDe(db, ficha.user)}*.`);
    }

    // 3. Se lo lleva.
    ficha.user = sender;
    ficha.claimedAt = ahora;
    delete ficha.reservedBy;
    delete ficha.reservedUntil;

    mio.characters ||= [];
    if (!mio.characters.includes(roll.id)) mio.characters.push(roll.id);
    mio.lastClaim = ahora + ESPERA;

    // El registro se queda (marcado) hasta que caduque: si otro lo cita, se le
    // puede decir de quién es en vez de «no hay ningún personaje».
    chat.rolls[msgId].claimed = true;
    chat.rolls[msgId].expiresAt = ahora + 5 * 60 * 1000;

    const segundos = ((ahora - (roll.tirado || ahora)) / 1000).toFixed(1);
    return enviartexto(
      `❀ *${ficha.name}* (${miles(ficha.value)}) ha sido reclamado por *${nombreDe(db, sender)}* — ${segundos}s`
    );
  },
};

function contextoDe(m) {
  return (
    m?.message?.extendedTextMessage?.contextInfo ||
    m?.message?.imageMessage?.contextInfo ||
    m?.message?.videoMessage?.contextInfo ||
    null
  );
}

function nombreDe(db, jid) {
  const u = db.users?.[jid];
  return u?.nombre || u?.name || String(jid || "").split("@")[0];
}
