/**
 * Ado Bot — AGPL-3.0-only. Ver NOTICE.
 * .payment — métodos de pago con botones de copiar (cta_copy).
 * Los métodos se guardan en la base de datos (settings.payments),
 * sin números escritos en el código. Solo botones estándar de
 * WhatsApp, con respaldo a texto.
 */
import { enviarConBotones, copiar, rapido } from "../../lib/botones.js";

const MAX_METODOS = 6;

function leerPagos(db, botJid) {
  try {
    const raw = db.settings?.[botJid]?.payments;
    const obj = typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function guardarPagos(db, botJid, pagos) {
  if (!db.settings) db.settings = {};
  if (!db.settings[botJid]) db.settings[botJid] = {};
  db.settings[botJid].payments = JSON.stringify(pagos);
}

export default {
  command: ["payment", "pagos", "donar", "metodospago"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, jidToNumber, isOwnerCheck, PREFIX } = ctx;
    const parts = (args || []).join(" ").trim().split(/\s+/).filter(Boolean);
    const sub = (parts[0] || "").toLowerCase();
    const botJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    const esOwner = isOwnerCheck(sender, sock);

    // .payment set <método> <número> (owner)
    if (sub === "set") {
      if (!esOwner) return enviartexto("❌ Solo los owners pueden configurar los pagos.");
      const metodo = (parts[1] || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
      const numero = parts.slice(2).join(" ").trim().slice(0, 40);
      if (!metodo || !numero) {
        return enviartexto(`❌ Uso: \`${PREFIX}payment set <método> <número>\`\nEjemplo: \`${PREFIX}payment set dana 1234567890\``);
      }
      const pagos = leerPagos(db, botJid);
      if (!pagos[metodo] && Object.keys(pagos).length >= MAX_METODOS) {
        return enviartexto(`❌ Ya hay ${MAX_METODOS} métodos. Borra uno con \`${PREFIX}payment del <método>\`.`);
      }
      pagos[metodo] = numero;
      guardarPagos(db, botJid, pagos);
      return enviartexto(`✅ Método *${metodo.toUpperCase()}* guardado.`);
    }

    // .payment del <método> (owner)
    if (sub === "del") {
      if (!esOwner) return enviartexto("❌ Solo los owners pueden configurar los pagos.");
      const metodo = (parts[1] || "").toLowerCase();
      const pagos = leerPagos(db, botJid);
      if (!metodo || !pagos[metodo]) return enviartexto(`❌ Método no encontrado. Uso: \`${PREFIX}payment del <método>\``);
      delete pagos[metodo];
      guardarPagos(db, botJid, pagos);
      return enviartexto(`✅ Método *${metodo.toUpperCase()}* eliminado.`);
    }

    // .payment → mostrar métodos
    const pagos = leerPagos(db, botJid);
    const entradas = Object.entries(pagos);
    const numero = sender.split("@")[0];

    if (entradas.length === 0) {
      return enviartexto(`💳 *MÉTODOS DE PAGO*\n\nHola *@${numero}*, aún no hay métodos configurados.\nLos owners pueden añadirlos con \`${PREFIX}payment set <método> <número>\`.`);
    }

    const lineas = entradas.map(([metodo, num]) => `│ ◈ *${metodo.toUpperCase()}* : \`${num}\``);
    const texto =
      `✦ Hola, *@${numero}*\n\n` +
      `╭──〔 💳 *MÉTODOS DE PAGO* 〕──⬣\n` +
      lineas.join("\n") + "\n" +
      `╰──────────────⬣\n\n` +
      `_Toca un botón para copiar el número._`;

    const botones = entradas.map(([metodo, num]) => copiar(`Copiar ${metodo.toUpperCase()}`, num));
    botones.push(rapido("Menú principal", "menu"));

    await enviarConBotones(sock, from, {
      titulo: "✦ Pagos",
      texto,
      pie: "Métodos de pago",
      botones,
      cita: m,
    }).catch(() => enviartexto(texto));
  },
};
