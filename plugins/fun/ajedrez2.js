/**
 * ajedrez2.js — Ajedrez embebido en WhatsApp
 * Usa el transporte de juego-html.js (rich response).
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/ajedrez2.html", import.meta.url);

export default {
  command: ["ajedrez2", "chess2", "ajedrezhtml2"],
  category: "fun",
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    return enviarJuegoHtml(sock, from, html, "♟ Ajedrez · Juego experimental");
  },
};