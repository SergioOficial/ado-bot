/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * plugins/info/panel.js — abre el panel de comandos dentro de WhatsApp.
 *
 * Usa `open_webview`, no `cta_url`: el primero muestra el título que le damos
 * ("Menú") en la barra; el segundo muestra el dominio de la página. El botón
 * `webview()` ya manda `title`, `link.in_app_webview` y la hoja alta.
 *
 * El menú de texto de `.menu` no se toca. Esto es una entrada aparte.
 */
import { enviarConBotones, webview } from "../../lib/botones.js";

/** Panel publicado en GitHub Pages. Se puede cambiar con PANEL_URL. */
const URL_PANEL = "https://riokuroxi-svg.github.io/";

function urlDelPanel() {
  const configurada = String(process.env.PANEL_URL || "").trim();
  if (!configurada) return URL_PANEL;
  try {
    const url = new URL(configurada);
    if (url.protocol !== "https:") return URL_PANEL;
    return url.href;
  } catch {
    return URL_PANEL;
  }
}

export default {
  command: ["panel", "menuweb"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    const url = urlDelPanel();
    try {
      const enviado = await enviarConBotones(sock, from, {
        texto: "🎛️ Click aquí para abrir el menú",
        pie: "Menú interactivo",
        botones: [webview("Menú", url)],
        cita: m,
      });
      if (!enviado) await enviartexto(`🎛️ Menú: ${url}`);
    } catch {
      await enviartexto(`🎛️ Menú: ${url}`);
    }
  },
};
