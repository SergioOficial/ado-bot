/**
 * infobothtml.js — Información del bot embebida en WhatsApp
 */
import { readFile } from "node:fs/promises";
import os from "node:os";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/infobot.html", import.meta.url);

export default {
  command: ["infobothtml", "infobot", "statushtml"],
  category: "info",
  execute: async ({ sock, from, config, BOT_NAME }) => {
    try {
      // 1. Leer el HTML base
      let html = await readFile(archivo, "utf8");

      // 2. Calcular las variables del sistema
      const uptimeSeg = process.uptime();
      const horas = Math.floor(uptimeSeg / 3600);
      const minutos = Math.floor((uptimeSeg % 3600) / 60);
      
      const ramTotalGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
      const ramLibreGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
      const ramUsadaGB = (ramTotalGB - ramLibreGB).toFixed(1);
      
      const plataforma = `${os.type()} ${os.arch()}`;
      const nodeVersion = process.version;
      const prefijo = config.prefix[0];
      const nombreBot = BOT_NAME || "Mi Bot";

      // 3. Reemplazar los placeholders en el HTML
      html = html.replace(/\{\{BOT_NAME\}\}/g, nombreBot);
      html = html.replace(/\{\{PREFIX\}\}/g, prefijo);
      html = html.replace(/\{\{UPTIME\}\}/g, `${horas}h ${minutos}m`);
      html = html.replace(/\{\{RAM_USADA\}\}/g, `${ramUsadaGB} GB`);
      html = html.replace(/\{\{RAM_TOTAL\}\}/g, `${ramTotalGB} GB`);
      html = html.replace(/\{\{PLATAFORMA\}\}/g, plataforma);
      html = html.replace(/\{\{NODE_VERSION\}\}/g, nodeVersion);

      // 4. Enviar la mini-app con el HTML ya procesado
      return enviarJuegoHtml(sock, from, html, `🤖 Info: ${nombreBot}`);

    } catch (e) {
      console.error("Error en infobothtml:", e);
      return sock.sendMessage(from, { text: `❌ Error al generar info: ${e.message}` });
    }
  },
};