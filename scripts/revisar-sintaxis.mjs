/**
 * Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE
 *
 * scripts/revisar-sintaxis.mjs — que ningún archivo tenga una coma de más.
 *
 * La suite prueba lo que está importado; esto revisa TODO el árbol, incluidos
 * los plugins que solo se cargan cuando alguien escribe su comando. Un archivo
 * con un error de sintaxis ahí no se ve hasta que un usuario lo pide, y
 * entonces el bot dice «error interno» sin más pistas.
 */

import { readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = new URL("..", import.meta.url).pathname;
const SALTAR = new Set(["node_modules", ".git", "tmp", "Sessions", "session"]);
const EXTENSIONES = new Set([".js", ".mjs", ".cjs"]);

function recorrer(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    if (SALTAR.has(nombre)) continue;
    const ruta = join(dir, nombre);
    const info = statSync(ruta);
    if (info.isDirectory()) recorrer(ruta, salida);
    else if (EXTENSIONES.has(extname(nombre))) salida.push(ruta);
  }
  return salida;
}

const archivos = recorrer(RAIZ);
const rotos = [];
for (const archivo of archivos) {
  try {
    execFileSync(process.execPath, ["--check", archivo], { stdio: "pipe" });
  } catch (err) {
    rotos.push({ archivo: relative(RAIZ, archivo), motivo: String(err.stderr || err.message).split("\n").slice(0, 3).join(" ") });
  }
}

if (rotos.length) {
  console.error(`✕ ${rotos.length} archivo(s) con la sintaxis rota:`);
  for (const { archivo, motivo } of rotos) console.error(`  · ${archivo}\n    ${motivo}`);
  process.exit(1);
}
console.log(`✓ sintaxis correcta en ${archivos.length} archivos`);
