/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .gp / .groupinfo — ficha completa del grupo: quién lo creó, cuándo, cuántos
 * hay, cuántos administradores, si está abierto o cerrado y las opciones que
 * tiene activadas.
 */
import { participantes } from "../../lib/grupo.js";

const fecha = (seg) =>
  seg ? new Date(Number(seg) * 1000).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export default {
  command: ["gp", "groupinfo", "infogrupo", "datosgrupo"],
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db, enviartexto } = ctx;
    if (!isGroup) return enviartexto("《✧》 Este comando solo funciona en grupos.");

    const meta = await sock.groupMetadata(from).catch(() => null);
    if (!meta) return enviartexto("《✧》 No pude leer los datos del grupo.");

    const admins = (meta.participants || []).filter((p) => p.admin);
    const actividad = db.chats?.[from]?.actividad || {};
    const lineas = [
      `📋 *${meta.subject}*`,
      "│",
      `│ ◈ ID › \`${meta.id}\``,
      `│ ◈ Creado › ${fecha(meta.creation)}`,
      meta.owner ? `│ ◈ Autor › @${String(meta.owner).split("@")[0].split(":")[0]}` : null,
      `│ ◈ Miembros › *${(meta.participants || []).length}* (${admins.length} admin)`,
      `│ ◈ Con mensajes contados › *${Object.keys(actividad).length}*`,
      `│ ◈ Mensajes › ${meta.announce ? "solo administradores 🔒" : "todos pueden escribir 🔓"}`,
      `│ ◈ Quién puede editar los datos › ${meta.restrict ? "solo administradores" : "todos"}`,
      `│ ◈ Bienvenida del bot › ${db.chats?.[from]?.welcome ? "sí ✅" : "no"}`,
      `│ ◈ Antilink › ${db.chats?.[from]?.antilink ? "activado 🔗" : "apagado"}`,
      `│ ◈ Bot › ${db.chats?.[from]?.botApagado ? "apagado 🔴" : "encendido 🟢"}`,
      "╰─",
    ].filter(Boolean);

    if (meta.desc) {
      const desc = String(meta.desc);
      lineas.push("", `📝 ${desc.length > 400 ? desc.slice(0, 400) + "…" : desc}`);
    }

    return sock.sendMessage(
      from,
      { text: lineas.join("\n"), mentions: meta.owner ? [meta.owner] : [] },
      { quoted: m }
    );
  },
};
