/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .pin     fija el mensaje que citas     ·    .unpin  lo suelta
 *
 * WhatsApp solo deja fijar en chats donde participas y tiene tope de tiempo (7
 * días), así que el mensaje de respuesta lo dice en vez de prometer eternidad.
 */
export default {
  command: ["pin", "fijar", "unpin", "desfijar"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, comando, enviartexto, PREFIX } = ctx;
    const quitar = comando === "unpin" || comando === "desfijar";
    const info = m.message?.extendedTextMessage?.contextInfo;

    if (!quitar && !info?.stanzaId) {
      return enviartexto(
        `《✧》 Cita el mensaje que quieres fijar y escribe *${PREFIX}pin*.\n> Para soltarlo: *${PREFIX}unpin* citando ese mismo mensaje.`
      );
    }

    try {
      // `chatModify` es la vía de Baileys para fijar; no hay atajo en sendMessage.
      await sock.chatModify({ pin: !quitar }, from);
      return enviartexto(
        quitar
          ? "📌 Mensaje desfijado."
          : "📌 Mensaje fijado.\n> WhatsApp lo mantiene 7 días como máximo."
      );
    } catch (err) {
      return enviartexto(
        `❌ No pude ${quitar ? "desfijar" : "fijar"} el mensaje.\n_${err.message}_\n` +
          `> Para fijar hace falta citar el mensaje y que yo tenga permiso en el chat.`
      );
    }
  },
};
