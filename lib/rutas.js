/**
 * lib/rutas.js — un solo sitio para las carpetas de datos.
 *
 * Antes cada archivo escribía la suya: index.js creaba `./sub/SubBots` y
 * `.bots` buscaba en `./Sessions/SubBots`, así que la lista de sub-bots salía
 * siempre con uno solo (el principal) aunque hubiera cuatro conectados.
 */

import fs from "fs";
import path from "path";

const raiz = process.cwd();

export const SESION_PRINCIPAL = path.join(raiz, "session");
export const SUB_SESIONES = path.join(raiz, "sub", "SubBots");
export const SUB_CONFIGS = path.join(raiz, "sub", "SubConfigs");
export const BASE_DATOS = path.join(raiz, "lib", "database.json");

/** Crea las carpetas que hagan falta. Es idempotente. */
export function asegurarCarpetas() {
  for (const dir of [SUB_SESIONES, SUB_CONFIGS]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

/** Números de sesión de sub-bot que tienen credenciales guardadas. */
export function subSesiones() {
  asegurarCarpetas();
  return fs
    .readdirSync(SUB_SESIONES)
    .filter((n) => fs.existsSync(path.join(SUB_SESIONES, n, "creds.json")));
}
