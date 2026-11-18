/**
 * papel.js — piedra papel o tijeras embebido en WhatsApp
 * Usa el transporte de juego-html.js (rich response).
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/papel.html", import.meta.url);

export default {
  command: ["papel", "piedra", "papelhtml"],
  category: "fun",
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    return enviarJuegoHtml(sock, from, html, " papel piedra tijeras xd· Juego experimental");
  },
};