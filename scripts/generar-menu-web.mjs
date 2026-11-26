/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * scripts/generar-menu-web.mjs — escribe docs/menu-flow.html con los comandos
 * que el bot tiene cargados de verdad. El HTML es estático y no depende de
 * nada externo: se puede publicar tal cual en GitHub Pages.
 *
 *   npm run menuweb
 *
 * FLOW_IMAGEN permite poner la foto de cabecera. FLOW_WEB_URL debe apuntar al
 * HTML publicado para que `.flow web` pueda abrirlo dentro de WhatsApp.
 */
import fs from "node:fs";
import path from "node:path";
import { loadPlugins, commands } from "../pluginLoader.js";
import { catalogo } from "../lib/menu-ayuda.js";
import { htmlMenu } from "../lib/flujo.js";
import { config } from "../config.js";

await loadPlugins();

/** Los nombres del propio menú no se cuentan como comandos del panel. */
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
]);

const grupos = catalogo(commands, OCULTOS);

/**
 * Nombres visibles del panel: se parecen a la referencia y conservan los
 * comandos reales del catálogo. El cambio es solo de presentación.
 */
const ROTULOS = {
  "Sub-bots": { titulo: "Subbots", emoji: "🤖", descripcion: "Vinculacion y ajustes del bot" },
  Diversión: { titulo: "Grupo", emoji: "👥" },
  Admin: { titulo: "Admin", emoji: "🛡️" },
  Descargas: { titulo: "Descargas", emoji: "⬇️" },
};
const ORDEN = ["Subbots", "Grupo", "Admin", "Descargas"];

const visibles = grupos.map((g) => {
  const rotulo = ROTULOS[g.titulo] || {};
  return { ...g, titulo: rotulo.titulo || g.titulo, emoji: rotulo.emoji || g.emoji, descripcion: rotulo.descripcion || g.descripcion };
});
visibles.sort((a, b) => {
  const ia = ORDEN.indexOf(a.titulo);
  const ib = ORDEN.indexOf(b.titulo);
  if (ia === -1 && ib === -1) return 0;
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
});

const html = htmlMenu(visibles, {
  nombre: process.env.FLOW_NOMBRE || "WaBot",
  prefijo: (config.prefix || [])[0] || ".",
  imagen: process.env.FLOW_IMAGEN || "assets/menu-hero.jpg",
  contador: process.env.FLOW_CONTADOR || undefined,
});

const destino = path.join(process.cwd(), "docs", "menu-flow.html");
fs.writeFileSync(destino, html, "utf8");
console.log(`📄 ${path.relative(process.cwd(), destino)} escrito · ${grupos.length} categorías`);
