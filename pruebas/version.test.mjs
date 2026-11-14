/**
 * La versión del bot, en un solo sitio.
 *
 * Pasó de verdad: `package.json` decía 1.1.0 (y GitHub tenía su etiqueta
 * v1.1.0) mientras `config.js` seguía con 1.0.6 escrito a mano, así que
 * `.infobot` anunciaba una versión que ya no existía. Estas pruebas existen para
 * que no vuelva a pasar sin que nadie se entere.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { igual, esVerdad } from "./ayuda.mjs";
import { config } from "../config.js";

const raiz = new URL("..", import.meta.url).pathname;
const paquete = JSON.parse(readFileSync(join(raiz, "package.json"), "utf-8"));

function archivos(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (nombre.endsWith(".js")) salida.push(ruta);
  }
  return salida;
}

export const pruebas = [
  [
    "la versión sale de package.json y no de config.js a mano",
    () => {
      igual(config.version, paquete.version, "versión del bot");
    },
  ],
  [
    "la versión se lee como un número de versión",
    () => {
      esVerdad(/^\d+\.\d+\.\d+/.test(config.version), `«${config.version}» no parece una versión`);
    },
  ],
  [
    "ningún archivo vuelve a escribir la versión a mano",
    () => {
      const culpables = [];
      for (const archivo of [...archivos(join(raiz, "plugins")), ...archivos(join(raiz, "lib"))]) {
        const fuente = readFileSync(archivo, "utf-8");
        if (/\bversion\s*:\s*["']\d+\.\d+\.\d+["']/.test(fuente)) {
          culpables.push(relative(raiz, archivo));
        }
      }
      igual(culpables.length, 0, `ponen la versión a mano: ${culpables.join(", ")}`);
    },
  ],
];
