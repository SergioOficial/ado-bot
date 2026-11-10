/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .hidetag <mensaje> — avisar a todo el grupo sin que salga la lista de menciones.
 *
 * La diferencia con .tag es que aquí el texto va tal cual y las menciones van
 * ocultas: sirve para avisos, no para «mira a quién llamo».
 */
export default {
  command: ["hidetag", "avisar", "tagoculto"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, PREFIX, config } = ctx;

    const texto = (args || []).join(" ").trim();
    const meta = await sock.groupMetadata(from).catch(() => null);
    if (!meta) return enviartexto("《✧》 No pude leer los miembros del grupo.");

    const menciones = (meta.participants || []).map((p) => p.id).filter(Boolean);
    const cuerpo = texto || `📢 *Aviso*\n\n${config.footer}`;

    try {
      await sock.sendMessage(from, { text: cuerpo, mentions: menciones }, { quoted: m });
    } catch (err) {
      return enviartexto(
        `⚠️ No pude avisar a todos.\n_${err.message}_\n> Si el grupo es muy grande, WhatsApp puede rechazar tantas menciones.`
      );
    }
  },
};
