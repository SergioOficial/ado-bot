/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .kick [@quien] [razón] — sacar a alguien del grupo.
 *
 * Nunca echa a un administrador ni a un dueño: en el original, escribir el
 * número a mano permitía echar a un admin (WhatsApp lo permite si tú eres admin
 * y el otro también, pero es un abuso fácil de evitar).
 */
import { objetivo, mencion, numeroDe, esAdminMeta, participantes } from "../../lib/grupo.js";
import { config } from "../../config.js";

export default {
  command: ["kick", "echar", "expulsar"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, args, db, enviartexto, PREFIX, isOwnerCheck, sender } = ctx;

    const jid = objetivo(ctx);
    if (!jid) {
      return enviartexto(
        `《✧》 A quién saco?\n> Menciona, cita su mensaje o escribe el número.\n> Ejemplo: *${PREFIX}kick @alguien spam*`
      );
    }

    const yo = numeroDe(sock.user?.id || sock.user?.jid);
    if (numeroDe(jid) === yo) return enviartexto("《✧》 No me puedo sacar a mí mismo.");
    if (numeroDe(jid) === numeroDe(sender)) return enviartexto("《✧》 No te voy a sacar a ti mismo.");

    // Protección: ni administradores ni dueños.
    const lista = await participantes(sock, from);
    const esAdminObjetivo = esAdminMeta(lista, jid);
    const esOwnerObjetivo = (config.owners || []).some((o) => numeroDe(o.number) === numeroDe(jid));
    if (esOwnerObjetivo) return enviartexto("《✧》 Ese número es dueño del bot: no lo voy a sacar.");
    if (esAdminObjetivo && !isOwnerCheck(sender, sock)) {
      return enviartexto("《✧》 Es administrador del grupo. Quítale el admin primero (o que lo haga un dueño).");
    }

    const mencionado = Boolean(m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length);
    const razon = (mencionado ? args.slice(1) : args).join(" ").replace(/^[\d+\s]+/, "").trim();

    try {
      await sock.groupParticipantsUpdate(from, [jid], "remove");
      return sock.sendMessage(
        from,
        {
          text: `🚪 ${mencion(jid, db)} salió del grupo.${razon ? `\n> Motivo: ${razon}` : ""}`,
          mentions: [jid],
        },
        { quoted: m }
      );
    } catch (err) {
      return enviartexto(
        `❌ No pude sacarlo.\n_${err.message}_\n> Casi siempre es porque yo no soy administrador o porque él es admin.`
      );
    }
  },
};
