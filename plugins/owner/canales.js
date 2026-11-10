/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * .newsletter / .canales   los canales de WhatsApp que el bot ha visto
 *
 * Este cliente de Baileys **no guarda la lista de chats** (`sock.chats` no
 * existe), así que no se puede preguntar por ahí. Lo que sí se puede es anotar
 * los canales conforme llegan sus mensajes: eso hace `onEvent`, y lo que se
 * lista después es un dato real, no una suposición.
 */
export default {
  command: ["newsletter", "canales"],

  execute: async (ctx) => {
    const { db, enviartexto } = ctx;
    const canales = db.canales || {};
    const jids = Object.keys(canales);

    if (!jids.length) {
      return enviartexto(
        `📰 *Canales*\n\n> Todavía no he visto ninguno.\n` +
          `> Sigue un canal con esta cuenta (o reenvía un mensaje suyo) y vuelve a mirar.\n` +
          `> Se apunta solo cuando llega algo: WhatsApp no da la lista completa.`
      );
    }

    const ordenados = jids.sort((a, b) => (canales[b].ultimo || 0) - (canales[a].ultimo || 0));
    return enviartexto(
      `📰 *Canales vistos* (${jids.length})\n\n` +
        ordenados
          .slice(0, 20)
          .map((j, i) => `${i + 1}. *${canales[j].nombre || "sin nombre"}*\n   \`${j}\``)
          .join("\n") +
        `\n\n> El nombre es el que trae el propio mensaje del canal.`
    );
  },

  event: "messages.upsert",
  onEvent: async (_sock, ev) => {
    if (ev?.type !== "notify") return;
    const m = ev.messages?.[0];
    if (!m?.message) return;

    const chat = m.key?.remoteJid;
    if (!chat?.endsWith("@newsletter")) return;

    const db = global.db?.data;
    if (!db) return;

    db.canales ||= {};
    const nombre = m.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName;
    db.canales[chat] = { nombre: nombre || db.canales[chat]?.nombre || "", ultimo: Date.now() };
  },
};
