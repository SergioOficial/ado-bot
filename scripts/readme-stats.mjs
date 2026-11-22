/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * scripts/readme-stats.mjs — pone al día el bloque de datos del README.
 *
 * POR QUÉ EXISTE
 * --------------
 * Un README que dice «3 estrellas» escrito a mano miente en cuanto alguien pulsa
 * la estrella. Este script pregunta los números a la API de GitHub y reescribe
 * solo el trozo que está entre los marcadores `<!-- stats:inicio -->` y
 * `<!-- stats:fin -->`. El resto del README no se toca.
 *
 * Uso:
 *   node scripts/readme-stats.mjs            informe por pantalla
 *   node scripts/readme-stats.mjs --escribir actualiza el README
 *
 * Sin token funciona (el repositorio es público), pero GitHub limita las
 * peticiones sin autenticar. Si tienes uno, pásalo en `GITHUB_TOKEN`.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(RAIZ, "README.md");
const REPO = process.env.ADO_REPO || "SergioOficial/ado-bot";
const INICIO = "<!-- stats:inicio -->";
const FIN = "<!-- stats:fin -->";

/** El trabajo de cada colaborador, para que la tabla diga algo más que números. */
const PAPELES = {
  SergioOficial: "Autor del bot, la base y los plugins",
  "riokuroxi-svg": "Auditoría, anti-ban, menú y porteo de la base",
};

async function api(ruta) {
  const cabeceras = { Accept: "application/vnd.github+json", "User-Agent": "ado-bot-readme" };
  if (process.env.GITHUB_TOKEN) cabeceras.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${ruta}`, { headers: cabeceras });
  if (!res.ok) throw new Error(`${ruta} → ${res.status} ${res.statusText}`);
  return res.json();
}

const dias = (desde) => Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 86_400_000));
const fecha = (iso) => new Date(iso).toISOString().slice(0, 10);

function tabla({ repo, gente, totalCommits }) {
  const filas = gente.map((p) => {
    const porcentaje = totalCommits ? (p.commits / totalCommits) * 100 : 0;
    const papel = PAPELES[p.login] || "Contribuciones puntuales";
    return `| [@${p.login}](${p.url}) | ${papel} | ${p.commits} | ${porcentaje.toFixed(1)}% |`;
  });

  return [
    INICIO,
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
    FIN,
  ].join("\n");
}

const repo = await api(`/repos/${REPO}`);
const contribuyentes = await api(`/repos/${REPO}/contributors?per_page=100`);

const gente = contribuyentes
  .filter((c) => c.type !== "Bot")
  .sort((a, b) => b.contributions - a.contributions)
  .map((c) => ({ login: c.login, commits: c.contributions, url: c.html_url }));

const totalCommits = gente.reduce((n, p) => n + p.commits, 0);
const bloque = tabla({ repo, gente, totalCommits });

if (process.argv.includes("--escribir")) {
  const texto = readFileSync(README, "utf8");
  const i = texto.indexOf(INICIO);
  const f = texto.indexOf(FIN);
  if (i < 0 || f < 0) {
    console.error(`❌ No encuentro los marcadores ${INICIO} … ${FIN} en README.md`);
    process.exit(1);
  }
  writeFileSync(README, texto.slice(0, i) + bloque + texto.slice(f + FIN.length), "utf8");
  console.log("📄 README.md actualizado");
} else {
  console.log(bloque);
  console.log(`\n(${gente.length} colaboradores · ${totalCommits} commits)`);
}
