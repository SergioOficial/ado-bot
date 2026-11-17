/**
 * infobothtml.js — Estado del bot
 * Usa el transporte de juego-html.js (rich response).
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/infobot.html", import.meta.url);

export default {
  command: ["infohtml", "informacion", "panel"],
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    return enviarJuegoHtml(sock, from, html, "Estado by · Wyra Studios");
  },
};