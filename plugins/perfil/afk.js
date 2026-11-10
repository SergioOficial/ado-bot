/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .afk [motivo]  — avisar de que no estás, y quitarlo al volver.
 *
 * Cómo funciona:
 *   · Si te mencionan o te responden mientras estás AFK, el bot contesta por ti
 *     con tu motivo (una vez cada 10 minutos por chat, para no inundar).
 *   · Escribes cualquier cosa y el AFK se borra solo, diciendo cuánto duró.
 *
 * Esto se hace con un evento, no con un hook: Levi no tiene hooks `before`, y
 * meterlos solo para esto habría sido tocar el núcleo a lo grande.
 */
import { numeroDe, mencion } from "../../lib/grupo.js";

const ESPERA_AVISO_MS = 10 * 60 * 1000;

function caja(db, jid) {
  const u = (db.users ||= {})[jid] ||= {};
  return u;
}

function duracion(ms) {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  if (h < 24) return `${h} h ${resto} min`;
  return `${Math.floor(h / 24)} días ${h % 24} h`;
}

export default {
  command: ["afk", "ausente"],
  execute: async (ctx) => {
    const { sender, args, db, enviartexto } = ctx;
    const u = caja(db, sender);
    const motivo = (args || []).join(" ").trim();

    // Ya estaba ausente → este comando lo quita.
    if (u.afk) {
      const cuanto = duracion(Date.now() - (u.afkDesde || Date.now()));
      u.afk = false;
      u.afkMotivo = "";
      u.afkDesde = 0;
      u.afkAvisado = {};
      db.saveDatabase?.();
      return enviartexto(`👋 ¡Bienvenido de vuelta! Estuviste ausente *${cuanto}*.`);
    }

    u.afk = true;
    u.afkMotivo = motivo || "sin decir el motivo";
    u.afkDesde = Date.now();
    u.afkAvisado = {};
    db.saveDatabase?.();
    return enviartexto(
      `💤 Quedas *ausente*.\n> Motivo: ${u.afkMotivo}\n> Si te mencionan, aviso por ti. Al escribir algo se quita solo.`
    );
  },

  // ── vigilante ────────────────────────────────────────────────────────────
  event: "messages.upsert",
  onEvent: async (sock, ev) => {
    if (ev?.type !== "notify") return;
    const m = ev.messages?.[0];
    if (!m?.message) return;

    const db = global.db?.data;
    if (!db?.users) return;

    const chat = m.key?.remoteJid;
    const autor = m.key?.participant || m.key?.remoteJid;
    if (!chat || !autor) return;

    // 1. Si el autor estaba ausente y escribe: se le quita el AFK.
    const u = db.users[autor];
    if (u?.afk) {
      const cuanto = duracion(Date.now() - (u.afkDesde || Date.now()));
      u.afk = false;
      u.afkDesde = 0;
      db.saveDatabase?.();
      await sock
        .sendMessage(chat, { text: `👋 ${mencion(autor, db)} volvió. Estuvo ausente *${cuanto}*.` }, { quoted: m })
        .catch(() => {});
      return; // el mensaje del que vuelve no se contesta con otro aviso
    }

    // 2. Si mencionan a alguien ausente, se avisa por él.
    const info = m.message.extendedTextMessage?.contextInfo;
    const buscados = [...(info?.mentionedJid || [])];
    if (info?.participant) buscados.push(info.participant);

    for (const jid of new Set(buscados)) {
      const ausente = db.users[jid];
      if (!ausente?.afk) continue;

      ausente.afkAvisado ||= {};
      const ultimo = ausente.afkAvisado[chat] || 0;
      if (Date.now() - ultimo < ESPERA_AVISO_MS) continue; // ya se avisó hace poco
      ausente.afkAvisado[chat] = Date.now();
      db.saveDatabase?.();

      await sock
        .sendMessage(
          chat,
          {
            text:
              `💤 ${mencion(jid, db)} está ausente.\n` +
              `> Motivo: ${ausente.afkMotivo || "sin decir"}\n` +
              `> Desde ${new Date(ausente.afkDesde || Date.now()).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
            mentions: [jid],
          },
          { quoted: m }
        )
        .catch(() => {});
    }
  },
};
