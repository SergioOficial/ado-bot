/**
 * geo.js — Geometry en WhatsApp
 * Usa el transporte de juego-html.js (rich response).
 */
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/geo.html", import.meta.url);

export default {
  command: ["dahs", "geometryhtml", "dash", "geometry", "geo"],
  execute: async ({ sock, from }) => {
    const html = await readFile(archivo, "utf8");
    // El HTML se transporta como rich response; solo Android lo renderiza in-chat.
    return enviarJuegoHtml(sock, from, html, "🎮 Geometry· Dash");
  },
};