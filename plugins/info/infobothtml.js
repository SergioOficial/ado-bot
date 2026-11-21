import { readFile } from "node:fs/promises";
import os from "node:os";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const archivo = new URL("../../juegos/infobot.html", import.meta.url);
const pfpUrl = "https://i.postimg.cc/432DgtBQ/IMG-20261110-WA0107.jpg";

export default {
  command: ["infobothtml", "infobot", "statushtml"],
  category: "info",
  execute: async (ctx) => {
    const { sock, from, config, BOT_NAME, db } = ctx;
    
    try {
      // 1. Leer el HTML base
      let html = await readFile(archivo, "utf8");

      // 2. Calcular variables
      const uptimeSeg = process.uptime();
      const horas = Math.floor(uptimeSeg / 3600);
      const minutos = Math.floor((uptimeSeg % 3600) / 60);
      
      const ramTotalGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
      const ramLibreGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
      const ramUsadaGB = (ramTotalGB - ramLibreGB).toFixed(1);
      
      const plataforma = `${os.type()} ${os.arch()}`;
      const prefijo = config.prefix[0];
      const nombreBot = BOT_NAME || "Ado-Bot";
      const totalUsers = Object.keys(db.users || {}).length.toLocaleString('en-US');

      // 3. Detectar tipo de bot (Principal, Sub o Premium)
      const miJid = sock.user?.id || "";
      const miNumero = miJid.split('@')[0].split(':')[0];
      
      // Verificamos si el número actual está en la lista de owners
      const esPrincipal = (config.owners || []).some(o => (o.number || o) === miNumero);
      
      // Verificamos si el dueño de este socket tiene premium en la DB
      const botDb = db.users[`${miNumero}@s.whatsapp.net`] || {};
      const esPremium = botDb.premium === true;

      let tipoBot = "Principal 🔰";
      if (!esPrincipal) {
        tipoBot = esPremium ? "Premium 💎" : "Sub-Bot 🔌";
      }

      // 4. Reemplazar los placeholders en el HTML
      // Usamos split().join() para evitar problemas con caracteres especiales en regex
      html = html.split("{{BOT_NAME}}").join(nombreBot);
      html = html.split("{{PFP}}").join(pfpUrl);
      html = html.split("{{TIPO}}").join(tipoBot);
      html = html.split("{{PREFIX}}").join(prefijo);
      html = html.split("{{UPTIME}}").join(`${horas}h ${minutos}m`);
      html = html.split("{{RAM_USADA}}").join(`${ramUsadaGB} GB`);
      html = html.split("{{PLATAFORMA}}").join(plataforma);
      html = html.split("{{USERS}}").join(totalUsers);

      // 5. Enviar la mini-app a WhatsApp
      return enviarJuegoHtml(sock, from, html, `⚡ ${nombreBot} | System Info`);

    } catch (e) {
      console.error("Error en infobothtml:", e);
      return sock.sendMessage(from, { text: `❌ Error al generar info: ${e.message}` });
    }
  },
};