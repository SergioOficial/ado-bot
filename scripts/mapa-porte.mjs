import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { pathToFileURL } from "url";

// Ruta del clon de Shin-MD: primer argumento o ../Shin-MD
const SHIN = process.argv[2] || join(process.cwd(), "..", "Shin-MD");
const LEVI = process.cwd();

// 1. Comandos de Shin (nombre de archivo → alias declarados)
const archivosShin = [];
(function rec(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) rec(p);
    else if (f.endsWith(".js")) archivosShin.push(p);
  }
})(join(SHIN, "cmds"));

const shin = [];
for (const p of archivosShin) {
  const src = readFileSync(p, "utf8");
  const m = src.match(/command:\s*\[([^\]]*)\]/) || src.match(/command:\s*["']([^"']+)["']/);
  const alias = m ? (m[1].match(/["']([^"']+)["']/g) || []).map((s) => s.slice(1, -1)) : [];
  const dentro = relative(join(SHIN, "cmds"), p);
  const cat = dentro.includes("/") ? dentro.split("/")[0] : "raíz";
  shin.push({ archivo: relative(SHIN, p), cat, alias, nombre: p.split("/").pop().replace(/\.js$/, "") });
}

// 2. Comandos de Levi (cargando los plugins)
const archivosLevi = [];
(function rec(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) rec(p);
    else if (f.endsWith(".js")) archivosLevi.push(p);
  }
})(join(LEVI, "plugins"));
const levi = new Set();
for (const p of archivosLevi) {
  try {
    const mod = await import(pathToFileURL(p).href);
    for (const c of (mod.default?.command || [])) levi.add(String(c).toLowerCase());
  } catch {}
}

const yaEsta = [], falta = [];
for (const s of shin) {
  const nombres = new Set([s.nombre.toLowerCase(), ...s.alias.map((a) => a.toLowerCase())]);
  const existe = [...nombres].some((n) => levi.has(n));
  (existe ? yaEsta : falta).push({ ...s, nombres: [...nombres] });
}

// 3. Ordenar por categoría y escribir
const porCat = {};
for (const f of falta) (porCat[f.cat] ||= []).push(f);

const total = shin.length;
// La tabla de «portados a mano» la escribe una persona: se conserva tal cual.
let portados = null;
try {
  const previo = readFileSync(join(LEVI, "docs", "PORTE.md"), "utf8");
  const m = previo.match(/## Portados a mano[\s\S]*?(?=\n## )/);
  if (m) portados = m[0].trimEnd();
} catch {}

const lineas = [
  "# Mapa del porteo desde Shin-MD",
  "",
  `_Generado el ${new Date().toISOString().slice(0, 10)} comparando los comandos de ` +
    `[Shin-MD](https://github.com/riokuroxi-svg/Shin-MD) con los registrados hoy en Levi-Bot._`,
  "",
  `- Comandos en Shin: **${total}**`,
  `- Ya existen en Levi (al menos con un nombre): **${yaEsta.length}**`,
  `- Pendientes de portar o de descartar: **${falta.length}**`,
  "",
  "«Ya existe» no significa «igual»: Levi puede tener el mismo comando con menos cosas.",
  "Cada comando que se porta se reescribe al formato de plugin de Levi y se apunta abajo.",
  "",
  portados || "## Portados a mano (sin registrar todavía)",
  "",
  "## Pendientes por categoría",
  "",
];
for (const [cat, lista] of Object.entries(porCat).sort()) {
  lineas.push(`### ${cat} (${lista.length})`, "");
  lineas.push("| Comando | En Shin | Nombres |", "|---|---|---|");
  for (const f of lista.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    lineas.push(`| ${f.nombre} | \`${f.archivo}\` | ${f.nombres.join(", ")} |`);
  }
  lineas.push("");
}
writeFileSync(join(LEVI, "docs", "PORTE.md"), lineas.join("\n"));
console.log(`Shin: ${total} · ya en Levi: ${yaEsta.length} · pendientes: ${falta.length}`);
console.log(Object.entries(porCat).map(([c, l]) => `${c}:${l.length}`).join(" · "));
