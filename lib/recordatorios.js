/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/recordatorios.js — avisos que sobreviven al reinicio.
 *
 * El original de Shin vivía en memoria con setTimeout (y se perdía al recargar).
 * Aquí los avisos son datos: se guardan en la base del bot y un vigilante los
 * revisa cada 20 s. Un aviso vencido se borra ANTES de mandarlo, así que no
 * puede salir dos veces aunque el proceso muera en medio.
 *
 * La base es la del bot (lib/database.json, con su autoguardado), así que no
 * hace falta otro archivo ni otra dependencia.
 */

export const MAX_MINUTOS = 60 * 24; // 24 h, igual que Shin
export const MAX_TEXTO = 300;
const LIMPIEZA_MS = 7 * 24 * 60 * 60 * 1000; // los vencidos de más de 7 días se tiran

/** Asegura la estructura en la base. */
function caja(db) {
  if (!db.recordatorios) db.recordatorios = { siguienteId: 1, lista: [] };
  return db.recordatorios;
}

/**
 * Guarda un aviso.
 * @returns {{ok:true, id:number, cuando:number, minutos:number, recortado:boolean}}
 */
export function agregar(db, { chat, autor, texto, minutos, ahora = Date.now() }) {
  // Number(), no parseInt(): parseInt("2abc") devuelve 2 y aceptaría basura.
  const pedidos = Number(minutos);
  if (!Number.isInteger(pedidos) || pedidos < 1) return { ok: false, error: "minutos" };

  const limpio = String(texto || "").trim();
  if (!limpio) return { ok: false, error: "texto" };

  const recortado = limpio.length > MAX_TEXTO;
  const usados = Math.min(pedidos, MAX_MINUTOS);
  const r = caja(db);
  const aviso = {
    id: r.siguienteId++,
    chat,
    autor,
    texto: recortado ? limpio.slice(0, MAX_TEXTO) : limpio,
    creado: ahora,
    cuando: ahora + usados * 60_000,
  };
  r.lista.push(aviso);
  return { ok: true, id: aviso.id, cuando: aviso.cuando, minutos: usados, recortado };
}

/** Los pendientes de una persona en un chat, del más cercano al más lejano. */
export function pendientesDe(db, chat, autor) {
  return caja(db)
    .lista.filter((r) => r.chat === chat && r.autor === autor)
    .sort((a, b) => a.cuando - b.cuando);
}

/** Borra un aviso, solo si es de quien lo pide. */
export function borrar(db, chat, autor, id) {
  const r = caja(db);
  const i = r.lista.findIndex((x) => x.id === Number(id) && x.chat === chat && x.autor === autor);
  if (i < 0) return false;
  r.lista.splice(i, 1);
  return true;
}

/**
 * Saca de la base los avisos que ya toca mandar (y los borra en el acto).
 * Devuelve la lista para que el vigilante los envíe.
 */
export function vencidos(db, ahora = Date.now()) {
  const r = caja(db);
  const salen = [];
  const quedan = [];
  const limite = ahora - LIMPIEZA_MS;
  for (const aviso of r.lista) {
    if (aviso.cuando <= ahora) {
      salen.push(aviso);
      continue;
    }
    // Muy viejo y ya vencido: fuera (no se acumula para siempre).
    if (aviso.cuando <= limite) continue;
    quedan.push(aviso);
  }
  if (salen.length || quedan.length !== r.lista.length) r.lista = quedan;
  return salen;
}

/** Texto del aviso, con cuánto tiempo pasó desde que se pidió. */
export function textoAviso(aviso, ahora = Date.now()) {
  const minutos = Math.max(1, Math.round((ahora - aviso.creado) / 60_000));
  return `⏰ *Recordatorio*\n\n» ${aviso.texto}\n\n_(programado hace ${minutos} min)_`;
}

/** «3 h 12 min» para las respuestas. */
export function esperaLegible(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}
