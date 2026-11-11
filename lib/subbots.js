/**
 * Ado-Bot — Copyright (C) 2026 los autores de Ado-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * lib/subbots.js — las cuentas que la gente crea con `.code` / `.jadibot`.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * Los sub-bots se guardaban en `sub/<número>`, pero `.bots` los buscaba en
 * `sub/SubBots/<número>` y `.stopbot` borraba ahí también. Resultado: el bot
 * creaba la sesión y el dueño no la veía en ningún sitio, y al pararlo no se
 * borraba nada (la credencial quedaba huérfana). Además, al reiniciar el bot
 * los sub-bots no volvían: había que pedir otro código, y como la sesión ya
 * existía, el código no se pedía y el sub-bot se quedaba sin arrancar nunca.
 *
 * Aquí está la carpeta en un solo sitio (`lib/rutas.js`), la migración de las
 * sesiones viejas y la lista de quién puede volver a arrancar solo.
 *
 * Todo lo de este archivo son funciones puras sobre el disco: no abren
 * conexiones, así que se pueden probar sin WhatsApp.
 */
import fs from "fs";
import path from "path";
import { SUB_SESIONES, SUB_CONFIGS, asegurarCarpetas } from "./rutas.js";

/** Números que WhatsApp da como LID (no sirven para pedir un código). */
export function pareceLid(numero = "") {
  return /^1\d{14}$/.test(String(numero));
}

/** ¿Ese número puede ser dueño de un sub-bot? */
export function numeroValido(numero = "") {
  const limpio = String(numero).replace(/\D/g, "");
  return limpio.length >= 8 && limpio.length <= 15 && !pareceLid(limpio);
}

/** Carpeta de credenciales de un sub-bot. */
export function rutaSesion(numero, raiz = SUB_SESIONES) {
  return path.join(raiz, String(numero).replace(/\D/g, ""));
}

/** Carpeta de ajustes de un sub-bot. */
export function rutaConfig(numero, raiz = SUB_CONFIGS) {
  return path.join(raiz, `subconfig_${String(numero).replace(/\D/g, "")}.json`);
}

/**
 * ¿La sesión ya está vinculada? `creds.json` existe y `registered` es true.
 * Devuelve `{ existe, registrada }` sin lanzar si el archivo está a medias.
 */
export function estadoSesion(numero, raiz = SUB_SESIONES) {
  const carpeta = rutaSesion(numero, raiz);
  const creds = path.join(carpeta, "creds.json");
  if (!fs.existsSync(creds)) return { existe: false, registrada: false };
  try {
    const datos = JSON.parse(fs.readFileSync(creds, "utf8"));
    return { existe: true, registrada: Boolean(datos.registered) };
  } catch {
    return { existe: true, registrada: false };
  }
}

/**
 * Las sesiones que pueden revivir solas al arrancar: las vinculadas.
 * Una sesión a medio vincular no se arranca, porque pediría un código que ya
 * nadie está mirando.
 */
export function sesionesParaRestaurar(raiz = SUB_SESIONES) {
  if (!fs.existsSync(raiz)) return [];
  return fs
    .readdirSync(raiz)
    .filter((n) => numeroValido(n) && estadoSesion(n, raiz).registrada)
    .sort();
}

/**
 * Mueve una sesión vieja de `sub/<número>` a `sub/SubBots/<número>`.
 *
 * No pisa nada: si el destino ya existe, deja la vieja donde está y lo dice.
 * Devuelve `{ movida, motivo }`.
 */
export function migrarSesionVieja(numero, { raiz = process.cwd() } = {}) {
  const vieja = path.join(raiz, "sub", String(numero).replace(/\D/g, ""));
  const nueva = rutaSesion(numero, path.join(raiz, "sub", "SubBots"));
  if (!fs.existsSync(path.join(vieja, "creds.json"))) return { movida: false, motivo: "no hay sesión vieja" };
  if (fs.existsSync(nueva)) return { movida: false, motivo: "el destino ya existe" };
  try {
    fs.mkdirSync(path.dirname(nueva), { recursive: true });
    fs.renameSync(vieja, nueva);
    return { movida: true, motivo: null };
  } catch (error) {
    return { movida: false, motivo: error.message };
  }
}

/** Ajustes de un sub-bot (dueños extra y lo que se añada después). */
export function leerConfig(numero, raiz = SUB_CONFIGS) {
  asegurarCarpetas();
  const archivo = rutaConfig(numero, raiz);
  if (!fs.existsSync(archivo)) return { owners: [] };
  try {
    return JSON.parse(fs.readFileSync(archivo, "utf8"));
  } catch {
    return { owners: [] };
  }
}

/** Escribe los ajustes de un sub-bot. Devuelve la ruta usada. */
export function guardarConfig(numero, cfg, raiz = SUB_CONFIGS) {
  asegurarCarpetas();
  const archivo = rutaConfig(numero, raiz);
  fs.writeFileSync(archivo, JSON.stringify(cfg, null, 2), "utf8");
  return archivo;
}

/** Borra la sesión de un sub-bot. Devuelve si había algo que borrar. */
export function borrarSesion(numero, raiz = SUB_SESIONES) {
  const carpeta = rutaSesion(numero, raiz);
  if (!fs.existsSync(carpeta)) return false;
  fs.rmSync(carpeta, { recursive: true, force: true });
  return true;
}
