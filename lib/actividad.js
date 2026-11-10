/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/actividad.js — quién habla en cada grupo.
 *
 * Se cuenta un mensaje por persona y grupo en `db.chats[chat].actividad`:
 *
 *   { "jid": { total: 42, ultimo: 1700000000000 } }
 *
 * Sirve para `.count`, `.topcount` y `.topinactive`. El contador está topado a
 * 1000 personas por grupo: un grupo con miles de mensajes no puede convertir la
 * base en un archivo que tarde diez segundos en guardarse.
 */
import { numeroDe } from "./grupo.js";

export const MAX_PERSONAS = 1000;

/** Apunta un mensaje. Devuelve false si no había dónde apuntarlo. */
export function apuntar(db, chat, jid, ahora = Date.now()) {
  if (!chat || !jid) return false;
  const c = (db.chats ||= {})[chat] ||= {};
  const act = (c.actividad ||= {});

  if (!act[jid] && Object.keys(act).length >= MAX_PERSONAS) return false;
  const previo = act[jid] || { total: 0, ultimo: 0 };
  act[jid] = { total: previo.total + 1, ultimo: ahora };
  return true;
}

/** Los que más hablan, de más a menos. */
export function masActivos(db, chat, limite = 10) {
  const act = db.chats?.[chat]?.actividad || {};
  return Object.entries(act)
    .map(([jid, d]) => ({ jid, total: d.total || 0, ultimo: d.ultimo || 0 }))
    .sort((a, b) => b.total - a.total || a.jid.localeCompare(b.jid))
    .slice(0, limite);
}

/**
 * Los que menos hablan, cruzando lo contado con la lista real de miembros
 * (así salen también los que nunca han escrito). Los administradores se pueden
 * dejar fuera: en muchos grupos no tiene sentido señalar al que administra.
 */
export function menosActivos(db, chat, miembros = [], limite = 10, incluirAdmins = false) {
  const act = db.chats?.[chat]?.actividad || {};
  return miembros
    .filter((p) => p?.id && (incluirAdmins || !p.admin))
    .map((p) => ({ jid: p.id, total: act[p.id]?.total || 0, ultimo: act[p.id]?.ultimo || 0 }))
    .sort((a, b) => a.total - b.total || a.jid.localeCompare(b.jid))
    .slice(0, limite);
}

/** «hace 3 días», «hoy», «nunca». */
export function hace(ms, ahora = Date.now()) {
  if (!ms) return "nunca";
  const dias = Math.floor((ahora - ms) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}

export { numeroDe };
