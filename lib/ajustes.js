/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/ajustes.js — los ajustes del bot que se cambian desde WhatsApp.
 *
 * POR QUÉ EXISTE
 * --------------
 * El prefijo, el modo privado, el enlace y el canal estaban escritos en
 * `config.js`: para cambiarlos había que editar el archivo y reiniciar. Aquí
 * viven los que se tocan con un comando, guardados en la base (`db.settings`),
 * así que sobreviven al reinicio y no hay que abrir nada.
 *
 * Regla: lo guardado manda sobre `config.js`, y si no hay nada guardado se usa
 * lo de `config.js` tal cual. Nunca al revés.
 */

/** El cajón de ajustes, creado si no existe. */
export function leerAjustes(db) {
  if (!db || typeof db !== "object") return {};
  db.settings ||= {};
  db.settings.ajustes ||= {};
  return db.settings.ajustes;
}

/** Guarda un ajuste. Devuelve el valor guardado. */
export function fijarAjuste(db, clave, valor) {
  const ajustes = leerAjustes(db);
  if (valor === null || valor === undefined || valor === "") delete ajustes[clave];
  else ajustes[clave] = valor;
  db.saveDatabase?.();
  return valor;
}

/** Borra un ajuste y deja que vuelva a mandar `config.js`. */
export function borrarAjuste(db, clave) {
  return fijarAjuste(db, clave, null);
}

/**
 * Los prefijos en uso.
 *
 * Si hay uno guardado con `.setprefix`, manda ese (solo ese: quien cambia el
 * prefijo quiere otro, no cinco). Si no, los de `config.js`.
 *
 * @returns {string[]}
 */
export function prefijosDe(db, config) {
  const guardado = leerAjustes(db).prefijo;
  if (typeof guardado === "string" && guardado.trim()) return [guardado.trim()];
  const deConfig = config?.prefix;
  if (Array.isArray(deConfig) && deConfig.length) return deConfig;
  if (typeof deConfig === "string" && deConfig) return [deConfig];
  return ["."];
}

/** ¿Está encendido el modo privado? (solo el dueño puede usar el bot) */
export function modoPrivado(db) {
  return leerAjustes(db).privado === true;
}

/** El enlace que se enseña en el menú y en `.info`. */
export function enlaceDelBot(db, config) {
  return leerAjustes(db).enlace || config?.github || config?.url || "https://github.com/SergioOficial/ado-bot";
}

/** El canal que se comparte: `{ jid, nombre }`, o null si no hay. */
export function canalDelBot(db) {
  const canal = leerAjustes(db).canal;
  if (!canal || !canal.jid) return null;
  return { jid: canal.jid, nombre: canal.nombre || "Canal oficial" };
}

/**
 * ¿Esto es un JID de canal de WhatsApp?
 *
 * Los canales terminan en `@newsletter`. Se comprueba el número de detrás para
 * que un texto cualquiera con «@newsletter» no pase por enlace de canal.
 */
export function esCanal(jid) {
  return /^\d{15,}@newsletter$/.test(String(jid || ""));
}

export default { leerAjustes, fijarAjuste, borrarAjuste, prefijosDe, modoPrivado, enlaceDelBot, canalDelBot, esCanal };
