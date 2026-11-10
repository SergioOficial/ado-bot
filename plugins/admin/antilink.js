/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .antilink on|off — borrar los enlaces de invitación que manden al grupo.
 *
 * Levi no tenía antilink. Este vigila `messages.upsert` igual que el router,
 * pero solo mira enlaces de grupos de WhatsApp (los `chat.whatsapp.com`), que
 * es lo que se usa para llenar grupos de spam. Ni administradores ni dueños se
 * ven afectados.
 *
 * Si el bot no es administrador no puede borrar nada: en ese caso avisa una
 * vez por chat en vez de intentarlo en cada mensaje para siempre.
 */
import { esAdminMeta, participantes, mencion, numeroDe } from "../../lib/grupo.js";

const ENLACE_GRUPO = /chat\.whatsapp\.com\/([0-9A-Za-z]{10,})/i;
const avisados = new Set();

export default {
  command: ["antilink", "antienlace"],
  isAdmin: true,

  execute: async (ctx) => {
    const { db, from, args, enviartexto, PREFIX } = ctx;
    const c = (db.chats ||= {})[from] ||= {};
    const estado = String(args[0] || "").toLowerCase();

    if (!["on", "off"].includes(estado)) {
      return enviartexto(
        `🔗 *Antilink:* ${c.antilink ? "ACTIVADO 🟢" : "DESACTIVADO 🔴"}\n` +
          `> *${PREFIX}antilink on* — borrar enlaces de grupos\n> *${PREFIX}antilink off* — dejar de vigilar\n` +
          `> Solo afecta a enlaces de *chat.whatsapp.com*; los administradores no se ven afectados.`
      );
    }

    c.antilink = estado === "on";
    db.saveDatabase?.();
    return enviartexto(
      c.antilink
        ? `🔗 Antilink *activado*.\n> Necesito ser administrador para poder borrar los mensajes.`
        : `🔗 Antilink *desactivado*.`
    );
  },

  // ── vigilante ────────────────────────────────────────────────────────────
  event: "messages.upsert",
  onEvent: async (sock, ev) => {
    if (ev?.type !== "notify") return;
    const m = ev.messages?.[0];
    if (!m?.message || m.key?.fromMe) return;

    const chat = m.key?.remoteJid;
    if (!chat || !chat.endsWith("@g.us")) return;

    const db = global.db?.data;
    if (!db?.chats?.[chat]?.antilink) return;

    const texto =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      m.message.videoMessage?.caption ||
      "";
    if (!ENLACE_GRUPO.test(texto)) return;

    const autor = m.key.participant || m.key.remoteJid;
    const participantesDelGrupo = await participantes(sock, chat);
    if (esAdminMeta(participantesDelGrupo, autor)) return; // los admins pueden

    // ¿Puedo borrar? Si no soy admin, avisar una vez y no insistir.
    const soyAdmin = esAdminMeta(participantesDelGrupo, sock.user?.id || sock.user?.jid);
    if (!soyAdmin) {
      if (!avisados.has(chat)) {
        avisados.add(chat);
        await sock
          .sendMessage(chat, {
            text: "⚠️ Hay *antilink* activado pero no soy administrador: no puedo borrar nada. Dame admin o apágalo con `.antilink off`.",
          })
          .catch(() => {});
      }
      return;
    }

    try {
      await sock.sendMessage(chat, { delete: m.key });
      await sock.sendMessage(chat, {
        text: `🔗 Enlace de grupo borrado.\n> ${mencion(autor, db)} los enlaces de invitación no van aquí.`,
        mentions: [autor],
      });
    } catch (err) {
      console.error(`⚠️ antilink: no pude borrar en ${chat}:`, err.message);
    }
  },
};
