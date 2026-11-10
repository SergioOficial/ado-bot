/**
 * scripts/auditar-comandos.mjs — qué comandos no pueden funcionar.
 *
 *   npm run auditar            (informe en pantalla)
 *   npm run auditar -- --md    (y además escribe docs/COMANDOS.md)
 *
 * No abre WhatsApp ni llama a ninguna API: lee los plugins y comprueba cosas
 * que se rompen solas, como una URL de API que ya no existe, un comando del
 * menú que no está registrado, o un plugin que necesita claves.
 *
 * Criterios (nada de «parece que funciona»):
 *   · PENDIENTE  lo usa una API de terceros que hay que probar antes de jurarlo
 *   · SOSPECHOSO depende de un servicio que ya ha muerto o de un archivo que
 *                no existe en el repo (se dice cuál)
 */

import { readdirSync, statSync, writeFileSync, readFileSync } from "fs";
import { join, relative } from "path";
import { pathToFileURL } from "url";

const raiz = process.cwd();
const dirPlugins = join(raiz, "plugins");
const escribirMd = process.argv.includes("--md");

function archivos(dir, salida = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) archivos(p, salida);
    else if (f.endsWith(".js")) salida.push(p);
  }
  return salida;
}

/** Servicios que se sabe que están muertos o que piden clave. */
const SERVICIOS = [
  { patron: /api\.qrserver\.com/, nota: "el QR ya no depende de esa API (ver plugins/utils/qr.js)" },
  { patron: /vihangayt|api-vihanga|vihanga/, nota: "API con clave en config.js; hay que probarla" },
  { patron: /api\.openai\.com|api\.groq\.com|deepseek\.com/, nota: "necesita clave de API para responder" },
  { patron: /api\.gemini|generativelanguage\.googleapis/, nota: "necesita clave de API" },
  { patron: /api\.spotify\.com/, nota: "necesita credenciales de Spotify" },
  { patron: /api\.telegram\.org/, nota: "no aplica en este bot" },
];

const filas = [];
const sinCargar = [];

for (const ruta of archivos(dirPlugins)) {
  const rel = relative(raiz, ruta);
  let mod;
  try {
    mod = await import(pathToFileURL(ruta).href);
  } catch (err) {
    sinCargar.push(`${rel}: ${err.message.split("\n")[0]}`);
    continue;
  }
  const p = mod.default;
  if (!p) continue;

  const codigoFuente = readFileSync(ruta, "utf8");
  // Los comentarios no cuentan: mencionar una API en una nota no es usarla.
  const codigo = codigoFuente
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const comandos = (Array.isArray(p.command) ? p.command : [p.command]).filter(Boolean);

  // 1. Archivos que el plugin espera y no están en el repo.
  const rutasFijas = [...codigo.matchAll(/["'](\.{1,2}\/[^"']+\.json)["']/g)].map((m) => m[1]);
  const archivosFaltantes = rutasFijas.filter((r) => {
    try {
      statSync(join(raiz, r));
      return false;
    } catch {
      return true;
    }
  });

  // 2. Servicios externos.
  const servicios = SERVICIOS.filter((s) => s.patron.test(codigo)).map((s) => s.nota);

  // 3. ¿Manda botones a mano en vez de lib/botones.js?
  // Contar los mensajes interactivos que se arman a mano (no las listas de
  // claves que se recorren para desenvolver un mensaje).
  const botonesArtesanales = /interactiveMessage\s*:/.test(codigo);

  // 4. ¿Comprueba owner a mano y podría saltarse algo?
  const ownerManual = /isOwnerCheck\(/.test(codigo);

  const problemas = [];
  const faltantesUnicos = [...new Set(archivosFaltantes)];
  if (faltantesUnicos.length)
    problemas.push(
      `lee ${faltantesUnicos.join(", ")}, que no existe${faltantesUnicos.length > 1 ? "n" : ""} en el repo`
    );
  problemas.push(...servicios);
  // Dos excepciones con motivo: `plugins/test/buttons.js` existe para enseñar
  // los botones uno por uno, y `plugins/owner/sonda.js` tiene que armarlos a
  // mano justamente para probar formatos que `lib/botones.js` normaliza. Ahí
  // usar la librería sería no medir nada.
  const ARMAN_A_PROPOSITO = ["plugins/test/buttons.js", "plugins/owner/sonda.js"];
  if (botonesArtesanales && !ARMAN_A_PROPOSITO.includes(rel))
    problemas.push("arma los botones a mano (usar lib/botones.js)");

  filas.push({ rel, comandos, owner: !!p.isOwner, problemas, ownerManual, eventos: p.event || null });
}

/** Comandos que el menú anuncia y no existen. */
const nombres = new Set(filas.flatMap((f) => f.comandos.map((c) => c.toLowerCase())));
const menuSrc = (() => {
  try {
    return readFileSync(join(dirPlugins, "info", "menu.js"), "utf8");
  } catch {
    return "";
  }
})();
const anunciados = [...new Set([...menuSrc.matchAll(/\$\{PREFIX\}([a-z0-9áéíóúñ]+)/gi)].map((m) => m[1].toLowerCase()))];
const fantasma = anunciados.filter((c) => !nombres.has(c));

const conProblemas = filas.filter((f) => f.problemas.length);
const totalComandos = nombres.size;

console.log(`\nComandos registrados: ${filas.length} archivos · ${totalComandos} nombres\n`);
console.log(`Con algo pendiente: ${conProblemas.length}\n`);
for (const f of conProblemas) {
  console.log(`· ${f.rel}  [${f.comandos.join(", ")}]`);
  for (const p of f.problemas) console.log(`    – ${p}`);
}
if (sinCargar.length) {
  console.log(`\nNo cargan (${sinCargar.length}):`);
  for (const s of sinCargar) console.log(`  ✕ ${s}`);
}
if (fantasma.length) {
  console.log(`\nEl menú anuncia y no existe (${fantasma.length}): ${fantasma.join(", ")}`);
}
const manual = filas.filter((f) => f.ownerManual).map((f) => f.rel);
if (manual.length) console.log(`\nComprueban owner a mano: ${manual.join(", ")}`);

if (escribirMd) {
  const lineas = [
    "# Estado de los comandos",
    "",
    "_Generado por `npm run auditar -- --md`. No es una promesa: es lo que el código hace hoy._",
    "",
    `- Archivos de plugin: **${filas.length}**`,
    `- Nombres de comando: **${totalComandos}**`,
    `- Con algo pendiente: **${conProblemas.length}**`,
    sinCargar.length ? `- **No cargan: ${sinCargar.length}**` : "- No cargan: **0**",
    fantasma.length ? `- Anunciados en el menú y no existen: ${fantasma.join(", ")}` : "- El menú no anuncia ningún comando inexistente",
    "",
    "## Pendientes, uno por uno",
    "",
    "| Archivo | Comandos | Qué falta |",
    "|---|---|---|",
    ...conProblemas.map((f) => `| \`${f.rel}\` | ${f.comandos.join(", ")} | ${f.problemas.join("; ")} |`),
    "",
    "## No cargan",
    "",
    ...(sinCargar.length ? sinCargar.map((s) => `- ${s}`) : ["- Ninguno."]),
    "",
  ];
  writeFileSync(join(raiz, "docs", "COMANDOS.md"), lineas.join("\n"));
  console.log("\n📄 docs/COMANDOS.md escrito.");
}
