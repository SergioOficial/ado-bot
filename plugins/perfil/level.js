/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .level [@quien]     tu nivel y cuánto falta para el siguiente
 * .lboard [n]         los de más nivel
 *
 * Se usa la MISMA cuenta de experiencia que ya usa Levi (100 × nivel por
 * escalón), no una curva nueva: si hubiera dos fórmulas, el nivel del perfil y
 * el de `.level` no cuadrarían, que es exactamente lo que pasaba en Shin.
 */
import { objetivo, numeroDe, mencion } from "../../lib/grupo.js";

const xpDelNivel = (nivel) => nivel * 100;

function barra(progreso, ancho = 12) {
  const llenos = Math.max(0, Math.min(ancho, Math.round(progreso * ancho)));
  return "▰".repeat(llenos) + "▱".repeat(ancho - llenos);
}

export default {
  command: ["level", "lvl", "experiencia", "lboard", "topnivel"],
  execute: async (ctx) => {
    const { args, comando, db, sender, m, from, sock, enviartexto } = ctx;
    db.users ||= {};

    // ── ranking ───────────────────────────────────────────────────────────
    if (comando === "lboard" || comando === "topnivel") {
      const limite = Math.min(Math.max(Number(args[0]) || 10, 3), 25);
      const lista = Object.entries(db.users)
        .filter(([, u]) => u && (u.nivel || u.exp))
        .map(([jid, u]) => ({ jid, nivel: u.nivel || 1, exp: u.exp || 0 }))
        .sort((a, b) => b.nivel - a.nivel || b.exp - a.exp)
        .slice(0, limite);

      if (!lista.length) return enviartexto("ꕥ Todavía no hay niveles: usa el bot y se empieza a contar.");
      const lineas = lista.map((x, i) => {
        const medalla = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
        return `${medalla} ${mencion(x.jid, db)} — Nv. *${x.nivel}* (${x.exp} XP)`;
      });
      return sock.sendMessage(
        from,
        { text: `🏅 *Tabla de niveles*\n\n${lineas.join("\n")}`, mentions: lista.map((x) => x.jid) },
        { quoted: m }
      );
    }

    // ── nivel propio o de otro ────────────────────────────────────────────
    const jid = objetivo(ctx) || sender;
    const u = db.users[jid];
    if (!u || (!u.nivel && !u.exp)) {
      return enviartexto(
        jid === sender
          ? `《✧》 Todavía no tienes nivel.\n> Habla en el grupo y se empieza a contar.`
          : `《✧》 *${numeroDe(jid)}* todavía no tiene nivel.`
      );
    }

    const nivel = u.nivel || 1;
    const necesario = xpDelNivel(nivel);
    const exp = u.exp || 0;
    const progreso = necesario > 0 ? Math.min(1, exp / necesario) : 1;
    const faltan = Math.max(0, necesario - exp);

    return sock.sendMessage(
      from,
      {
        text:
          `🏅 *${mencion(jid, db)}*\n\n` +
          `│ Nivel › *${nivel}*\n` +
          `│ Experiencia › *${exp}/${necesario}*\n` +
          `│ [${barra(progreso)}] ${Math.round(progreso * 100)} %\n` +
          `│ Para el nivel *${nivel + 1}* › faltan *${faltan}* XP\n` +
          `╰─`,
        mentions: [jid],
      },
      { quoted: m }
    );
  },
};
