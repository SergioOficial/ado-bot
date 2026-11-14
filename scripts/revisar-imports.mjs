/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL.
 *
 * scripts/revisar-imports.mjs — que todo lo que se importa exista de verdad.
 *
 * `node --check` solo mira la sintaxis de cada archivo por separado: un import a
 * un archivo que no existe, o a un nombre que el módulo no exporta, pasa la
 * puerta y revienta al arrancar. Y una dependencia que se usa sin declararla en
 * package.json funciona en la máquina de quien la tiene instalada de rebote y
 * falla en cualquier instalación limpia — le pasó a `.apk` con `aptoide-scraper`
 * y a `.mf` y `.tourl` con `mime-types` y `form-data`.
 *
 * Esto revisa las dos cosas, sin abrir WhatsApp:
 *   1. cada import relativo apunta a un archivo que existe;
 *   2. cada import de paquete está declarado en package.json (o es de Node);
 *   3. cada nombre importado de un módulo propio está exportado ahí.
 *
 * Uso:  npm run imports
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, extname, relative, dirname, resolve } from "node:path";
import { builtinModules } from "node:module";

const RAIZ = process.cwd();
const SALTAR = new Set(["node_modules", ".git", "tmp", "session", "sub", "Sessions"]);
const EXTENSIONES = new Set([".js", ".mjs", ".cjs"]);
const NATIVOS = new Set(builtinModules);

const pkg = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8"));
const DECLARADAS = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {}),
]);

function recorrer(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    if (SALTAR.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta, salida);
    else if (EXTENSIONES.has(extname(nombre))) salida.push(ruta);
  }
  return salida;
}

/**
 * Quita los comentarios antes de buscar imports. Sin esto, un `from "x"` que
 * aparezca dentro de un comentario de varias líneas se traga el texto de en
 * medio y la revisión inventa nombres que nadie importó.
 */
function sinComentarios(fuente) {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

/** Los `import … from "x"`, `import "x"` y `await import("x")` de un archivo. */
function importsDe(fuente) {
  const limpia = sinComentarios(fuente);
  const encontrados = [];
  // `[^;]*?` en vez de `[\s\S]*?`: una cláusula no cruza un punto y coma, así
  // dos imports seguidos no se mezclan.
  const estaticos = /(?:^|[;\n])\s*(?:import|export)\s+([^;]*?)\s*from\s*["']([^"']+)["']/g;
  const dinamicos = /import\(\s*["']([^"']+)["']\s*\)/g;
  const soloEfecto = /(?:^|[;\n])\s*import\s*["']([^"']+)["']/g;

  let m;
  while ((m = estaticos.exec(limpia))) encontrados.push({ clausula: m[1], spec: m[2] });
  while ((m = dinamicos.exec(limpia))) encontrados.push({ clausula: null, spec: m[1] });
  while ((m = soloEfecto.exec(limpia))) encontrados.push({ clausula: null, spec: m[1] });
  return encontrados;
}

/** Nombres que trae una cláusula de import: `a`, `{ b }`, `{ c as d }`. */
function nombresDe(clausula) {
  if (!clausula) return [];
  const entreLlaves = clausula.match(/\{([^}]*)\}/);
  if (!entreLlaves) return [];
  return entreLlaves[1]
    .split(",")
    .map((parte) => parte.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);
}

/**
 * Nombres que exporta un módulo propio (lectura textual, sin ejecutarlo).
 * Cubre las cuatro formas que hay en el árbol: declarada, lista, destructuring
 * (así reexporta `lib/baileys.js` lo que trae el paquete) y `export *`.
 */
function exportsDe(archivo) {
  const fuente = sinComentarios(readFileSync(archivo, "utf8"));
  const nombres = new Set();

  for (const m of fuente.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) {
    nombres.add(m[1]);
  }
  for (const m of fuente.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const parte of m[1].split(",")) {
      const limpio = parte.trim().split(/\s+as\s+/).pop().trim();
      if (limpio) nombres.add(limpio);
    }
  }
  // `export const { a, b, c } = modulo;` → cada clave es un export.
  for (const m of fuente.matchAll(/export\s+const\s*\{([^}]*)\}\s*=/g)) {
    for (const parte of m[1].split(",")) {
      const limpio = parte.trim().split(/:/).pop().split(/\s+as\s+/).pop().trim();
      if (limpio && /^[A-Za-z0-9_$]+$/.test(limpio)) nombres.add(limpio);
    }
  }
  if (/export\s+default/.test(fuente)) nombres.add("default");
  // `export * from "./x"` reexporta todo: no se puede saber qué sin ejecutarlo.
  if (/export\s*\*\s*from/.test(fuente)) nombres.add("*");
  return nombres;
}

/** Resuelve un spec relativo a un archivo del disco. */
function resolver(spec, desde) {
  const base = resolve(dirname(desde), spec);
  const candidatos = [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, join(base, "index.js")];
  for (const c of candidatos) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

const archivos = recorrer(RAIZ);
const problemas = [];

for (const archivo of archivos) {
  const rel = relative(RAIZ, archivo);
  const fuente = readFileSync(archivo, "utf8");

  for (const { clausula, spec } of importsDe(fuente)) {
    // Plantillas literales (`?t=${Date.now()}`) no se pueden resolver: se saltan.
    if (spec.includes("${")) continue;

    if (spec.startsWith(".")) {
      const destino = resolver(spec, archivo);
      if (!destino) {
        problemas.push(`${rel} → no existe "${spec}"`);
        continue;
      }
      // Los nombres importados tienen que estar exportados en el destino.
      const exportados = exportsDe(destino);
      for (const nombre of nombresDe(clausula)) {
        if (exportados.has("*")) continue;
        if (!exportados.has(nombre)) {
          problemas.push(`${rel} → "${relative(RAIZ, destino)}" no exporta ${nombre}`);
        }
      }
      continue;
    }

    if (spec.startsWith("node:")) continue;

    const paquete = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    // De Node: siempre disponible. Que no lleve el prefijo `node:` es estilo,
    // no un fallo, así que no puede tumbar la puerta.
    if (NATIVOS.has(paquete)) continue;
    if (!DECLARADAS.has(paquete)) {
      problemas.push(`${rel} → "${paquete}" no está en package.json`);
    }
  }
}

if (problemas.length) {
  console.error(`✕ ${problemas.length} problema(s) de importación:`);
  for (const p of problemas) console.error(`  · ${p}`);
  process.exit(1);
}
console.log(`✓ importaciones resueltas en ${archivos.length} archivos`);
