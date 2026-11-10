/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .warmup   (dueño) el tope diario de envíos, el riesgo y la cola, en 3 segundos
 * .antiban  (dueño) lo mismo, explicado
 *
 * Existe porque sin esto el tope diario es invisible: al alcanzarlo el bot deja
 * de contestar los comandos normales (`.play` sobre todo) mientras `.menu` y
 * `.ping` siguen respondiendo, y el único rastro queda en el log. Aquí se ve.
 *
 * Solo lectura: no cambia nada. Los topes se ajustan por entorno:
 *   WARMUP_START_MSGS, WARMUP_MAX_MSGS, WARMUP_DAYS, ANTIBAN_BASE_MS, ANTIBAN=off
 */
const SIN_TOPE = 1e9;

function barra(usados, tope, ancho = 12) {
  if (!Number.isFinite(tope) || tope <= 0 || tope >= SIN_TOPE) return "";
  const llenos = Math.max(0, Math.min(ancho, Math.round((usados / tope) * ancho)));
  return "▰".repeat(llenos) + "▱".repeat(ancho - llenos);
}

function faltaParaReinicio() {
  // El contador se reinicia a las 00:00 UTC, no a medianoche local: se dice
  // tal cual para que nadie espere a la hora equivocada.
  const ms = new Date().setUTCHours(24, 0, 0, 0) - Date.now();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h} h ${m} min`;
}

export default {
  command: ["warmup", "tope", "antiban"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto, comando } = ctx;
    const anti = global.antiban;

    if (!anti?.limitador) {
      return enviartexto(
        "⚠️ El anti-ban no está en marcha.\n> Se prepara al conectar; si el bot acaba de arrancar, espera unos segundos."
      );
    }

    const r = anti.limitador.resumen();
    const cola = anti.cola?.estado?.() || { enEspera: 0, pausada: false, motivos: [], inciertos: 0 };
    const salud = anti.salud?.estado?.() || { riesgo: 0, nivel: "normal" };
    const falta = Math.max(0, r.tope - r.msgsHoy);

    const lineas = [
      "╭───「 🛡️ *ANTI-BAN* 」───",
      `│ Día del calentamiento › *${r.dia}*${r.terminado ? " (terminado)" : ` de ${anti.limitador.ajustes.diasCalentamiento}`}`,
      `│ Enviados hoy › *${r.msgsHoy}/${r.tope}* ${barra(r.msgsHoy, r.tope)}`,
      `│ Quedan hoy › *${r.alcanzado ? "ninguno" : falta}*`,
      `│ Se reinicia en › *${faltaParaReinicio()}* (00:00 UTC)`,
      `│ Total de la sesión › *${r.total}*`,
      `│ Cola › *${cola.enEspera}* en espera${cola.pausada ? ` · ⏸️ parada por: ${cola.motivos.join(", ")}` : " · ▶️ andando"}`,
      `│ Sin respuesta (inciertos) › *${cola.inciertos || 0}*`,
      `│ Riesgo › *${salud.riesgo}/100* (${salud.nivel})`,
      "╰──────────────",
    ];

    if (comando === "antiban") {
      lineas.push(
        "",
        "*Qué está haciendo*",
        "▸ Espera entre envíos: al azar alrededor de " + anti.limitador.ajustes.baseMs + " ms (no fija).",
        "▸ Los textos largos esperan más; las reacciones y borrados no gastan cuota.",
        "▸ `.menu`, `.ping` y los avisos del bot pasan aunque el tope esté alcanzado.",
        "▸ Si la conexión se cae, el mensaje espera y sale al volver (no se pierde).",
        "▸ Si un envío se queda sin respuesta, *no se repite*: mejor perder uno que mandar dos.",
        "",
        "*Qué NO hace*: no garantiza que una cuenta no sea bloqueada. Baja el riesgo; no lo elimina.",
        "",
        "*Para cambiarlo* (en el entorno, y reiniciar):",
        "> `WARMUP_START_MSGS=20 WARMUP_MAX_MSGS=500 WARMUP_DAYS=7`",
        "> `ANTIBAN_BASE_MS=1200` · `ANTIBAN=off` lo apaga del todo"
      );
    } else if (r.alcanzado) {
      lineas.push(
        "",
        "⚠️ *Tope alcanzado*: los comandos que envían texto esperan al reinicio.",
        "`.menu` y `.ping` siguen respondiendo. Si te pasa a menudo, sube `WARMUP_MAX_MSGS`."
      );
    }

    return enviartexto(lineas.join("\n"));
  },
};
