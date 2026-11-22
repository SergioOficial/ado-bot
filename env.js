/**
 * CREADOR: Sergio Gómez Gort con Asistencia en Comandos de Shin MD
 * BOT: Ado-Bot
 *
 * env.js — lee `.env` antes de que nadie pregunte por una variable.
 *
 * El bot ya leía 18 variables de entorno, pero no había ninguna forma de
 * escribirlas sin exportarlas a mano en cada terminal: no había `.env` ni
 * librería que lo leyera. Así que `config.js`, `ANTIBAN`, `RITMO` o
 * `BAILEYS_PACKAGE` solo se podían cambiar recordando `export` antes de
 * arrancar, y al cerrar la sesión se perdía.
 *
 * Este archivo se importa el PRIMERO en `boot/arranque.js` a propósito: en
 * ESM las importaciones se evalúan en orden, así que esto corre antes de
 * que `lib/antiban.js` lea `process.env.ANTIBAN` al cargarse.
 *
 * Reglas:
 *   · no pisa lo que ya venga del entorno (`ANTIBAN=off npm start` manda
 *     sobre el archivo, igual que con cualquier dotenv);
 *   · sin dependencias: son veinte líneas y una dependencia menos;
 *   · si no hay `.env`, no hace nada y el bot arranca igual.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));

/** Aplica las líneas del `.env`. Devuelve cuántas variables se usaron. */
export function cargarEnv(archivo = path.join(RAIZ, ".env")) {
  let texto;
  try {
    texto = fs.readFileSync(archivo, "utf-8");
  } catch {
    return 0; // no hay .env: no es un error
  }

  let aplicadas = 0;
  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const corte = limpia.indexOf("=");
    if (corte <= 0) continue;
    const clave = limpia.slice(0, corte).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(clave)) continue;
    if (process.env[clave] !== undefined) continue; // el entorno manda
    let valor = limpia.slice(corte + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    process.env[clave] = valor;
    aplicadas++;
  }
  return aplicadas;
}

cargarEnv();

export default { cargarEnv };
