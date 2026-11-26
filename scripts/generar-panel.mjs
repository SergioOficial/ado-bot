/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * scripts/generar-panel.mjs — escribe docs/panel.html con los comandos que el
 * bot tiene cargados de verdad. El HTML es estático y no depende de nada
 * externo: se puede publicar tal cual en GitHub Pages.
 *
 *   npm run panel
 */
import fs from "node:fs";
import path from "node:path";
import { loadPlugins, commands } from "../pluginLoader.js";
import { catalogo } from "../lib/menu-ayuda.js";
import { descripcionDe } from "../lib/descripciones.js";
import { htmlPanel } from "../lib/panel-web.js";
import { config } from "../config.js";

await loadPlugins();

/** Los comandos del propio panel no se cuentan como comandos del panel. */
const OCULTOS = new Set([
  "menu",
  "help",
  "menú",
  "ayuda",
  "allmenu",
  "comandos",
  "menucat",
  "categorias",
  "categorías",
  "panel",
  "menuweb",
]);

/** Nombres visibles que se parecen a la referencia y conservan los comandos reales. */
const ROTULOS = {
  "Sub-bots": { titulo: "Subbots", emoji: "🤖", descripcion: "Vinculación y ajustes del bot" },
  Diversión: { titulo: "Grupo", emoji: "👥" },
  Admin: { titulo: "Admin", emoji: "🛡️" },
  Descargas: { titulo: "Descargas", emoji: "⬇️" },
  Test: { titulo: "Pruebas", emoji: "🧪" },
};
const ORDEN = ["Subbots", "Grupo", "Admin", "Descargas"];

const grupos = catalogo(commands, OCULTOS).map((g) => {
  const rotulo = ROTULOS[g.titulo] || {};
  return {
    ...g,
    titulo: rotulo.titulo || g.titulo,
    emoji: rotulo.emoji || g.emoji,
    descripcion: rotulo.descripcion || g.descripcion,
    comandos: g.comandos.map((c) => ({
      nombre: c.nombre,
      alias: c.alias,
      descripcion: descripcionDe(c.nombre) || descripcionDe(c.alias[0]) || "",
    })),
  };
});

grupos.sort((a, b) => {
  const ia = ORDEN.indexOf(a.titulo);
  const ib = ORDEN.indexOf(b.titulo);
  if (ia === -1 && ib === -1) return 0;
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
});

const html = htmlPanel(grupos, {
  nombre: process.env.PANEL_NOMBRE || "WaBot",
  prefijo: (config.prefix || [])[0] || ".",
  contador: process.env.PANEL_CONTADOR || undefined,
});

const destino = path.join(process.cwd(), "docs", "panel.html");
fs.writeFileSync(destino, html, "utf8");
console.log(`📄 ${path.relative(process.cwd(), destino)} escrito · ${grupos.length} categorías · ${grupos.reduce((n, g) => n + g.comandos.length, 0)} comandos`);
