/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .health    cómo está el bot por dentro (RAM, tiempo encendido, base, plugins)
 * .runtime   tiempo encendido y cuándo arrancó
 * .status    estado corto
 * .lid       tu identidad tal como la ve WhatsApp (teléfono y LID)
 * .cache     tamaño de la base y de la sesión
 * .infobot   resumen para el dueño (versión, cliente, prefijos, owners)
 *
 * `.health` mirado desde el móvil es la diferencia entre «no responde, ni idea»
 * y «no responde porque lleva 480 MB de RAM».
 */
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { paquete } from "../../lib/baileys.js";
import { BASE_DATOS, SUB_SESIONES } from "../../lib/rutas.js";
import { numeroDe } from "../../lib/grupo.js";

const ARRANQUE = Date.now();

function bytes(n) {
  if (n > 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function pesoDe(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    total += st.isDirectory() ? pesoDe(p) : st.size;
  }
  return total;
}

function encendido(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (d) return `${d} d ${h} h ${m} min`;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${seg} s`;
  return `${seg} s`;
}

export default {
  command: ["health", "salud", "runtime", "uptime", "status", "estado", "lid", "cache", "infobot"],
  execute: async (ctx) => {
    const { sock, from, sender, m, comando, db, enviartexto, config, BOT_NAME, PREFIX } = ctx;
    const ahora = Date.now();

    if (comando === "lid") {
      const yo = sock.user || {};
      return enviartexto(
        `🪪 *Identidad que ve WhatsApp*\n\n` +
          `│ Mi ID › \`${yo.id || "—"}\`\n` +
          `│ Mi LID › \`${yo.lid || "—"}\`\n` +
          `│ Tu JID › \`${sender}\`\n` +
          `│ Tu número › *${numeroDe(sender)}*\n` +
          `╰─\n\n> WhatsApp puede dar el mismo teléfono como \`@s.whatsapp.net\` o como \`@lid\`.`
      );
    }

    if (comando === "infobot") {
      return enviartexto(
        `🤖 *${BOT_NAME}*\n\n` +
          `│ Versión › *${config.version}*\n` +
          `│ Cliente › \`${paquete}\`\n` +
          `│ Prefijos › ${config.prefix.join(" ")}\n` +
          `│ Dueños › *${(config.owners || []).length}*\n` +
          `│ Encendido › *${encendido(ahora - ARRANQUE)}*\n` +
          `│ Node › ${process.version}\n` +
          `╰─\n\n> ${config.footer}`
      );
    }

    if (comando === "cache" || comando === "status" || comando === "estado" || comando === "uptime") {
      const base = existsSync(BASE_DATOS) ? statSync(BASE_DATOS).size : 0;
      if (comando === "uptime" || comando === "status" || comando === "estado") {
        return enviartexto(
          `🟢 *En línea* desde hace *${encendido(ahora - ARRANQUE)}*.\n` +
            `> Mensajes atendidos: *${global.__contadorMensajes || 0}*\n` +
            `> Base de datos: *${bytes(base)}*`
        );
      }
      return enviartexto(
        `🗄️ *Espacio que ocupa*\n\n` +
          `│ Base (lib/database.json) › *${bytes(base)}*\n` +
          `│ Sesión principal › *${bytes(pesoDe(join(process.cwd(), "session")))}*\n` +
          `│ Sub-bots › *${bytes(pesoDe(SUB_SESIONES))}*\n` +
          `│ Usuarios guardados › *${Object.keys(db.users || {}).length}*\n` +
          `│ Grupos con datos › *${Object.keys(db.chats || {}).length}*\n` +
          `╰─`
      );
    }

    // ── .health ────────────────────────────────────────────────────────────
    const mem = process.memoryUsage();
    const base = existsSync(BASE_DATOS) ? statSync(BASE_DATOS).size : 0;
    const usuarios = Object.keys(db.users || {}).length;
    const grupos = Object.keys(db.chats || {}).length;

    const lineas = [
      `🩺 *Salud del bot*`,
      ``,
      `│ Encendido › *${encendido(ahora - ARRANQUE)}*`,
      `│ Memoria usada › *${bytes(mem.rss)}* (${bytes(mem.heapUsed)} de trabajo)`,
      `│ Node › ${process.version}`,
      `│ Cliente › \`${paquete}\``,
      `│ Base › *${bytes(base)}* · ${usuarios} usuarios · ${grupos} chats`,
      `│ Mensajes atendidos › *${global.__contadorMensajes || 0}*`,
      `│ Conexión › ${sock.ws?.isOpen || sock.ws?.readyState === 1 ? "abierta 🟢" : "revisar 🟡"}`,
    ];

    // Anti-ban: el riesgo y lo que hay en la cola, si está en marcha.
    const anti = global.antiban;
    if (anti?.limitador) {
      const r = anti.limitador.resumen();
      const c = anti.cola?.estado?.() || { enEspera: 0, pausada: false, motivos: [] };
      lineas.push(
        `│ Envíos hoy › *${r.msgsHoy}/${r.tope}* · riesgo *${anti.salud?.estado?.().riesgo ?? 0}/100*`,
        `│ Cola › *${c.enEspera}*${c.pausada ? ` ⏸️ (${c.motivos.join(", ")})` : ""}`
      );
    }
    lineas.push(`╰─`);

    if (mem.rss > 700 * 1048576) {
      lineas.push("", "⚠️ Más de 700 MB de RAM: conviene reiniciar con `.restart`.");
    }

    return enviartexto(lineas.join("\n"));
  },
};
