/**
 * tetris.js — Tetris embebido en WhatsApp
 * Usa el transporte de juego-html.js (rich response).
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/tetris.html", import.meta.url);

export default {
  command: ["tetris", "tetrishtml"],
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    return enviarJuegoHtml(sock, from, html, "🧱 Tetris · Juego experimental");
  },
};