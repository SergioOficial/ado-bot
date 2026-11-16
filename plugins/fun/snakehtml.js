/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Snake adaptado de wa-games-kit por TEAM ABIX (MIT): licencias/wa-games-kit-MIT.txt.
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/snake.html", import.meta.url);

export default {
  command: ["snake", "snakehtml"],
  category: "fun",
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    // La aceptación del relay no confirma que todos los teléfonos lo rendericen.
    return enviarJuegoHtml(sock, from, html, "🐍 Snake · juego experimental");
  },
};
