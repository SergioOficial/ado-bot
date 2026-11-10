/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .count                 cuántos miembros tiene el grupo
 * .topcount [n]          los que más hablan
 * .topinactive [n]       los que menos (o nada) hablan
 *
 * El contador se alimenta solo, al pasar por el evento de mensajes: no hace
 * falta que nadie escriba un comando para que empiece a contar.
 */
import { apuntar, masActivos, menosActivos, hace } from "../../lib/actividad.js";
import { participantes, numeroDe } from "../../lib/grupo.js";

function lista(items, db, conFecha) {
  return items
    .map((x, i) => {
      const nombre = db?.users?.[x.jid]?.nombre;
      const quien = nombre ? `@${numeroDe(x.jid)} (${nombre})` : `@${numeroDe(x.jid)}`;
      const extra = conFecha ? ` · ${hace(x.ultimo)}` : "";
      return `│ ${i + 1}. ${quien} — *${x.total}* msj${extra}`;
    })
    .join("\n");
}

export default {
  command: ["count", "topcount", "topinactive", "topinactivos"],
  isAdmin: true,

  execute: async (ctx) => {
    const { sock, from, m, args, comando, db, enviartexto } = ctx;
    const limite = Math.min(Math.max(Number(args[0]) || 10, 3), 25);

    const miembros = await participantes(sock, from);
    if (!miembros.length) return enviartexto("《✧》 No pude leer los miembros del grupo.");

    if (comando === "count") {
      const activos = masActivos(db, from, 1)[0];
      return enviartexto(
        `👥 *${miembros.length}* miembros en este grupo.\n` +
          `> Administradores: *${miembros.filter((p) => p.admin).length}*\n` +
          `> Con mensajes contados: *${Object.keys(db.chats?.[from]?.actividad || {}).length}*` +
          (activos ? `\n> El que más habla: @${numeroDe(activos.jid)} (*${activos.total}*)` : "")
      );
    }

    if (comando === "topcount") {
      const top = masActivos(db, from, limite);
      if (!top.length) return enviartexto("ꕥ Todavía no hay mensajes contados en este grupo.");
      return sock.sendMessage(
        from,
        {
          text: `📊 *Los ${top.length} que más hablan*\n${lista(top, db, true)}\n\n> Se cuenta desde que el bot entró al grupo.`,
          mentions: top.map((x) => x.jid),
        },
        { quoted: m }
      );
    }

    // topinactive
    const inactivos = menosActivos(db, from, miembros, limite);
    if (!inactivos.length) return enviartexto("《✧》 No hay miembros que mostrar.");
    return sock.sendMessage(
      from,
      {
        text:
          `😴 *Los ${inactivos.length} que menos hablan*\n${lista(inactivos, db, false)}\n\n` +
          `> Los administradores no se incluyen.\n> _Que nadie se lo tome a mal: es un contador, no un juicio._`,
        mentions: inactivos.map((x) => x.jid),
      },
      { quoted: m }
    );
  },

  // ── contador ─────────────────────────────────────────────────────────────
  event: "messages.upsert",
  onEvent: async (sock, ev) => {
    if (ev?.type !== "notify") return;
    const m = ev.messages?.[0];
    if (!m?.message || m.key?.fromMe) return;

    const chat = m.key?.remoteJid;
    if (!chat?.endsWith("@g.us")) return;

    const db = global.db?.data;
    if (!db) return;

    const autor = m.key.participant || m.key.remoteJid;
    if (!autor || autor === chat) return;
    apuntar(db, chat, autor);
  },
};
