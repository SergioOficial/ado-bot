/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .encuesta — encuesta, quiz o voto múltiple nativos de WhatsApp.
 *
 *   .encuesta ¿Qué pizza?|Pepperoni|Hawaiana|4 Quesos
 *   .encuesta ¿Capital de Japón?|Kioto|*Tokio|Osaka      ← quiz
 *   .encuesta multi ¿Qué días?|Lunes|Martes|Viernes     ← varias respuestas
 *
 * Si el envío falla, se cae a un texto con las opciones numeradas: quien pidió
 * la encuesta nunca se queda sin nada.
 */
import { interpretar, explicarError, enviarEncuesta } from "../../lib/encuestas.js";

export default {
  command: ["encuesta", "poll", "votacion", "votación", "quiz"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, PREFIX } = ctx;
    const texto = (ctx.texto || "").trim();

    const encuesta = interpretar(texto);
    if (!encuesta.ok) {
      return enviartexto(explicarError(encuesta.error, PREFIX));
    }

    await sock.sendMessage(from, { react: { text: "🗳️", key: m.key } }).catch(() => {});

    const resultado = await enviarEncuesta(sock, from, encuesta, { cita: m });
    if (resultado.ok) return;

    // Respaldo: las opciones escritas, para que se pueda votar aunque sea
    // respondiendo con un número.
    const lista = encuesta.opciones.map((o, i) => `${i + 1}. ${o}`).join("\n");
    const tipo = encuesta.tipo === "quiz" ? "QUIZ" : "ENCUESTA";
    await enviartexto(
      `🗳️ *${tipo}*\n\n*${encuesta.pregunta}*\n\n${lista}\n\n` +
        `> La encuesta nativa no salió (${resultado.error?.message || "error"}).\n` +
        `> Responde con el número de tu opción.`
    );
  },
};
