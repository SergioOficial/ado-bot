/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .promote [@quien] — dar administrador   ·   .demote [@quien] — quitarlo
 *
 * Se comprueba que el cambio se aplicó de verdad: WhatsApp puede aceptar la
 * petición y no cambiarlo (por ejemplo, si el bot no es admin), y el original
 * decía «hecho» igual.
 */
import { objetivo, mencion, participantes, esAdminMeta } from "../../lib/grupo.js";

export default {
  command: ["promote", "demote", "ascender", "degradar"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, comando, db, enviartexto, PREFIX } = ctx;
    const ascender = comando === "promote" || comando === "ascender";

    const jid = objetivo(ctx);
    if (!jid) {
      return enviartexto(
        `《✧》 A quién?\n> *${PREFIX}${ascender ? "promote" : "demote"} @alguien*\n> También sirve citando su mensaje.`
      );
    }

    const antes = await participantes(sock, from);
    if (esAdminMeta(antes, jid) === ascender) {
      return enviartexto(
        ascender
          ? "《✧》 Esa persona ya es administradora."
          : "《✧》 Esa persona no es administradora."
      );
    }

    try {
      const respuesta = await sock.groupParticipantsUpdate(from, [jid], ascender ? "promote" : "demote");
      // WhatsApp devuelve el estado por participante; si dice 403 no se hizo.
      const estado = respuesta?.find((r) => r.jid === jid)?.status;
      const despues = await participantes(sock, from);
      const hecho = esAdminMeta(despues, jid) === ascender;

      if (!hecho || estado === "403" || estado === "401") {
        return enviartexto(
          `❌ WhatsApp no aplicó el cambio (estado ${estado || "desconocido"}).\n` +
            `> Normalmente es porque yo no soy administrador del grupo.`
        );
      }

      return sock.sendMessage(
        from,
        {
          text: ascender
            ? `👑 ${mencion(jid, db)} ahora es *administrador* del grupo.`
            : `⬇️ ${mencion(jid, db)} ya no es administrador.`,
          mentions: [jid],
        },
        { quoted: m }
      );
    } catch (err) {
      return enviartexto(`❌ No pude cambiarlo.\n_${err.message}_`);
    }
  },
};
