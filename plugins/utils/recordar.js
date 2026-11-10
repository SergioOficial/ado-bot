/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .recordar <minutos>|<mensaje>   programa un aviso en este chat
 * .recordar lista                los tuyos, con su número
 * .olvidar <número>              borra uno
 *
 * Los avisos se guardan en la base del bot: sobreviven a un reinicio, cosa que
 * el setTimeout del original no hacía.
 */
import { agregar, pendientesDe, borrar, esperaLegible, MAX_MINUTOS } from "../../lib/recordatorios.js";

const AYUDA = (PREFIX) =>
  `《✧》 Programa un recordatorio.\n` +
  `> Formato: *${PREFIX}recordar <minutos>|<mensaje>*\n` +
  `> Ejemplo: ${PREFIX}recordar 5|tomar agua\n` +
  `> Ver los tuyos: *${PREFIX}recordar lista*\n` +
  `> Borrar uno: *${PREFIX}olvidar <número>*`;

export default {
  command: ["recordar", "recordatorio", "reminder", "alarma", "olvidar", "delrecordatorio"],
  execute: async (ctx) => {
    const { db, sender, from, args, comando, enviartexto, PREFIX } = ctx;

    // ── borrar ────────────────────────────────────────────────────────────
    if (comando === "olvidar" || comando === "delrecordatorio") {
      const id = String(args[0] || "").replace("#", "");
      if (!id) return enviartexto(`《✧》 Dime cuál: *${PREFIX}olvidar 3* (mira los números con *${PREFIX}recordar lista*)`);
      return enviartexto(
        borrar(db, from, sender, id)
          ? `🗑️ Recordatorio *#${id}* borrado.`
          : `《✧》 No tienes ningún recordatorio con el número *#${id}*.`
      );
    }

    // ── lista ─────────────────────────────────────────────────────────────
    if (String(args[0] || "").toLowerCase() === "lista") {
      const mios = pendientesDe(db, from, sender);
      if (!mios.length) return enviartexto("ꕥ No tienes recordatorios pendientes en este chat.");
      const ahora = Date.now();
      const lineas = mios.slice(0, 10).map(
        (r) => `│ #${r.id} · en ${esperaLegible(r.cuando - ahora)} · ${r.texto.slice(0, 60)}`
      );
      if (mios.length > 10) lineas.push(`│ … y ${mios.length - 10} más`);
      return enviartexto(`⏰ *Tus recordatorios*\n${lineas.join("\n")}\n\n> Borrar uno: *${PREFIX}olvidar <número>*`);
    }

    // ── crear ─────────────────────────────────────────────────────────────
    const texto = (ctx.texto || "").trim();
    if (!texto) return enviartexto(AYUDA(PREFIX));

    const corte = texto.indexOf("|");
    if (corte < 0) {
      return enviartexto(`《✧》 Separa los minutos del mensaje con *|*.\n> Ejemplo: ${PREFIX}recordar 5|tomar agua`);
    }

    const minutos = texto.slice(0, corte).trim();
    const mensaje = texto.slice(corte + 1).trim();

    const r = agregar(db, { chat: from, autor: sender, texto: mensaje, minutos });
    if (!r.ok) {
      if (r.error === "minutos")
        return enviartexto(`《✧》 Los minutos tienen que ser un número mayor que 0.\n> El máximo son ${MAX_MINUTOS / 60} h.`);
      return enviartexto("《✧》 Falta el mensaje del recordatorio.");
    }

    const cuando = new Date(r.cuando);
    const hora = cuando.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    const aviso =
      r.minutos < Number.parseInt(minutos, 10)
        ? `\n> (el máximo son ${MAX_MINUTOS / 60} h: lo puse para dentro de un día)`
        : "";

    return enviartexto(
      `⏰ *Recordatorio programado*\n\n📝 » ${r.texto}${r.recortado ? "…" : ""}\n\n` +
        `> Te aviso en *${esperaLegible(r.cuando - Date.now())}* (a las ${hora}).${aviso}\n` +
        `> Aunque el bot se reinicie, el aviso sigue guardado.`
    );
  },
};
