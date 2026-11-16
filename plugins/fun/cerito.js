/**
 * cerito.js — Tres en línea embebido en WhatsApp
 * Usa el transporte de juego-html.js (rich response).
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juegos-html.js";

const archivo = new URL("../../juegos/cerito.html", import.meta.url);

export default {
  command: ["cerito", "ceritohtml", "gato", "tateti", "tictactoe", "3enlinea"],
  category: "fun",
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    // El HTML se transporta como rich response; solo Android lo renderiza in-chat.
    return enviarJuegoHtml(sock, from, html, "🎮 Cerito Cruz · Tres en línea");
  },
};