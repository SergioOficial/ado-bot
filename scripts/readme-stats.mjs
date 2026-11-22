/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * scripts/readme-stats.mjs — pone al día los bloques vivos del README.
 *
 * POR QUÉ EXISTE
 * --------------
 * Un README escrito a mano miente en cuanto pasa una semana: dice «3 estrellas»
 * cuando hay cinco y «250 pruebas» cuando hay 327. Este script rellena cuatro
 * bloques y no toca nada más del documento:
 *
 *   <!-- estado:inicio -->      versión, plugins, comandos, archivos, pruebas
 *   <!-- categorias:inicio -->  los comandos que hay, por categoría
 *   <!-- cambios:inicio -->     los últimos commits de verdad
 *   <!-- stats:inicio -->       commits, colaboradores con su %, días, estrellas
 *
 * Los números salen de donde tienen que salir: los del bot, del árbol y de la
 * suite; los de GitHub, de la API. Ninguno está escrito a mano.
 *
 * Uso:
 *   node scripts/readme-stats.mjs              enseña los bloques por pantalla
 *   node scripts/readme-stats.mjs --escribir   actualiza README.md
 *   node scripts/readme-stats.mjs --sin-pruebas  no ejecuta la suite (más rápido)
 *
 * Sin token funciona (el repositorio es público), pero GitHub limita las
 * peticiones sin autenticar. Si tienes uno, pásalo en `GITHUB_TOKEN`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(RAIZ, "README.md");
const REPO = process.env.ADO_REPO || "SergioOficial/ado-bot";
const ESCRIBIR = process.argv.includes("--escribir");
const CON_PRUEBAS = !process.argv.includes("--sin-pruebas");

const MARCAS = {
  estado: ["<!-- estado:inicio -->", "<!-- estado:fin -->"],
  categorias: ["<!-- categorias:inicio -->", "<!-- categorias:fin -->"],
  cambios: ["<!-- cambios:inicio -->", "<!-- cambios:fin -->"],
  stats: ["<!-- stats:inicio -->", "<!-- stats:fin -->"],
};

/** El trabajo de cada colaborador, para que la tabla diga algo más que números. */
const PAPELES = {
  SergioOficial: "Autor del bot, la base y los plugins",
  "riokuroxi-svg": "Auditoría, anti-ban, menú, README y porteo de la base",
};

const fecha = (iso) => new Date(iso).toISOString().slice(0, 10);
const dias = (desde) => Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 86_400_000));

// ── Lo que se puede contar en el propio árbol ───────────────────────────────

/** Archivos de código del proyecto, con el mismo criterio que `npm run sintaxis`. */
function archivosJs(carpeta = RAIZ, salida = []) {
  for (const nombre of readdirSync(carpeta)) {
    if (["node_modules", ".git", "tmp", "Sessions", "session"].includes(nombre)) continue;
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) archivosJs(ruta, salida);
    else if (/\.(js|mjs|cjs)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/** Cuántos plugins y cuántos nombres de comando hay de verdad. */
async function contarPlugins() {
  process.chdir(RAIZ);
  const { commands, loadPlugins } = await import(join(RAIZ, "pluginLoader.js"));
  const { catalogo } = await import(join(RAIZ, "lib/menu-ayuda.js"));
  const silencio = console.log;
  console.log = () => {}; // el cargador presume de lo que carga; aquí sobra
  try {
    await loadPlugins();
  } finally {
    console.log = silencio;
  }
  const OCULTOS = new Set(["menu", "help", "menú", "ayuda", "allmenu", "comandos", "categorias", "categorías"]);
  const grupos = catalogo(commands, OCULTOS);
  // Cuántos archivos de plugin hay en el disco: es el número que la gente cuenta.
  const archivosDePlugin = archivosJs(join(RAIZ, "plugins")).length;
  return {
    plugins: archivosDePlugin,
    nombres: commands.size,
    categorias: grupos.length,
    grupos,
  };
}

/** Cuántas pruebas pasan, ejecutando la suite de verdad. */
function contarPruebas() {
  try {
    const salida = execFileSync(process.execPath, [join(RAIZ, "scripts/probar.mjs")], {
      cwd: RAIZ,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 180_000,
    });
    const m = salida.match(/(\d+) pruebas pasan · 0 fallan/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

// ── Lo que se pregunta a GitHub ─────────────────────────────────────────────

async function api(ruta) {
  const cabeceras = { Accept: "application/vnd.github+json", "User-Agent": "ado-bot-readme" };
  if (process.env.GITHUB_TOKEN) cabeceras.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${ruta}`, { headers: cabeceras });
  if (!res.ok) throw new Error(`${ruta} → ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Los bloques ─────────────────────────────────────────────────────────────

function bloqueEstado({ version, plugins, nombres, categorias, archivos, pruebas, ci }) {
  const [ini, fin] = MARCAS.estado;
  return [
    ini,
    `_Actualizado el ${fecha(new Date().toISOString())} con \`npm run readme\`; los números salen del árbol, de la suite y de GitHub._`,
    "",
    "| | |",

    "|---|---|",
    `| **Versión** | \`${version}\` |`,
    `| **Plugins** | ${plugins} archivos, ${nombres} nombres de comando en ${categorias} categorías |`,
    `| **Código** | ${archivos} archivos JavaScript |`,
    `| **Pruebas** | ${pruebas ? `**${pruebas}** en verde` : "_no ejecutadas_"} |`,
    ci ? `| **Último CI** | ${ci} |` : null,
    fin,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function bloqueCategorias({ grupos, prefijo = "." }) {
  const [ini, fin] = MARCAS.categorias;
  const filas = grupos.map(
    (g) =>
      `| ${g.emoji} **${g.titulo}** | ${String(g.comandos.length).padStart(2)} | ` +
      `${g.comandos.slice(0, 6).map((c) => `\`${prefijo}${c.nombre}\``).join(" ")}${g.comandos.length > 6 ? " …" : ""} |`
  );
  return [
    ini,
    "| Categoría | Comandos | Algunos |",
    "|---|---|---|",
    ...filas,
    fin,
  ].join("\n");
}

function bloqueCambios(limite = 8) {
  const [ini, fin] = MARCAS.cambios;
  let log = "";
  try {
    log = execFileSync("git", ["log", `-${limite}`, "--date=short", "--pretty=format:%ad\t%s"], {
      cwd: RAIZ,
      encoding: "utf8",
    });
  } catch {
    return [ini, "_Sin historial de git._", fin].join("\n");
  }
  const filas = log
    .split("\n")
    .filter(Boolean)
    .map((linea) => {
      const [cuando, ...resto] = linea.split("\t");
      const titulo = resto.join(" ").replace(/\|/g, "\\|");
      return `| ${cuando} | ${titulo} |`;
    });
  return [ini, "| Fecha | Cambio |", "|---|---|", ...filas, fin].join("\n");
}

function bloqueStats({ repo, gente, totalCommits }) {
  const [ini, fin] = MARCAS.stats;
  const filas = gente.map((p) => {
    const porcentaje = totalCommits ? (p.commits / totalCommits) * 100 : 0;
    return `| [@${p.login}](${p.url}) | ${PAPELES[p.login] || "Contribuciones puntuales"} | ${p.commits} | ${porcentaje.toFixed(1)}% |`;
  });
  return [
    ini,
    `_Datos pedidos a GitHub el ${fecha(new Date().toISOString())}. Se actualizan con \`npm run readme\`._`,
    "",
    "| Dato | Valor |",
    "|---|---|",
    `| Commits totales | **${totalCommits}** |`,
    `| Días desde el primer commit | **${dias(repo.created_at)}** |`,
    `| Último cambio | **${fecha(repo.pushed_at)}** (hace ${dias(repo.pushed_at)} d) |`,
    `| Estrellas · forks · avisos abiertos | **${repo.stargazers_count}** · **${repo.forks_count}** · **${repo.open_issues_count}** |`,
    `| Tamaño del repositorio | **${(repo.size / 1024).toFixed(1)} MB** |`,
    "",
    "| Colaborador | Qué hizo | Commits | % |",
    "|---|---|---|---|",
    ...filas,
    fin,
  ].join("\n");
}

// ── A trabajar ──────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8"));
const conteo = await contarPlugins();
const pruebas = CON_PRUEBAS ? contarPruebas() : null;

let repo = null;
let gente = [];
let totalCommits = 0;
try {
  repo = await api(`/repos/${REPO}`);
  gente = (await api(`/repos/${REPO}/contributors?per_page=100`))
    .filter((c) => c.type !== "Bot")
    .sort((a, b) => b.contributions - a.contributions)
    .map((c) => ({ login: c.login, commits: c.contributions, url: c.html_url }));
  totalCommits = gente.reduce((n, p) => n + p.commits, 0);
} catch (err) {
  console.warn(`⚠️ Sin datos de GitHub (${err.message}); se deja el bloque como estaba.`);
}

const bloques = {
  estado: bloqueEstado({
    version: pkg.version,
    plugins: conteo.plugins,
    nombres: conteo.nombres,
    categorias: conteo.categorias,
    archivos: archivosJs().length,
    pruebas,
  }),
  categorias: bloqueCategorias(conteo),
  cambios: bloqueCambios(),
};

if (repo) bloques.stats = bloqueStats({ repo, gente, totalCommits });

let texto = readFileSync(README, "utf8");
for (const [nombre, bloque] of Object.entries(bloques)) {
  const [ini, fin] = MARCAS[nombre];
  const i = texto.indexOf(ini);
  const f = texto.indexOf(fin);
  if (i < 0 || f < 0) {
    console.warn(`⚠️ No encuentro los marcadores de «${nombre}» en README.md`);
    continue;
  }
  texto = texto.slice(0, i) + bloque + texto.slice(f + fin.length);
}

if (ESCRIBIR) {
  writeFileSync(README, texto, "utf8");
  console.log(`📄 README.md actualizado · ${conteo.plugins} plugins · ${conteo.nombres} nombres · ${pruebas ?? "?"} pruebas`);
} else {
  console.log(texto.slice(texto.indexOf(MARCAS.estado[0]), texto.indexOf(MARCAS.cambios[1]) + MARCAS.cambios[1].length));
  console.log("\n(--escribir para llevarlo al README)");
}
