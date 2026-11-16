import fs from "fs";
import path from "path";

// ⚠️ Cambia esta URL por la tuya de GitHub Pages / Vercel / Netlify
const GATO_URL = "https://github/SergioOficial/ado-bot/Gato_en_el_bot.html";

// Ruta local del HTML (para el fallback de descarga)
const HTML_LOCAL = path.resolve("./Gato_en_el_bot.html");

export default {
  command: ["gato", "tateti", "tictactoe", "cerito", "3enlinea"],
  category: "fun",
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config, comando } = ctx;
    const p = (config.prefix && config.prefix[0]) || ".";
    const cmd = comando || "gato";
    const sub = (args[0] || "").toLowerCase();

    // ── Sub-comando: descargar el HTML ──
    if (sub === "doc" || sub === "descargar" || sub === "archivo") {
      try {
        if (!fs.existsSync(HTML_LOCAL)) {
          throw new Error("No encuentro el HTML en el servidor.");
        }
        const buffer = fs.readFileSync(HTML_LOCAL);
        return sock.sendMessage(from, {
          document: buffer,
          mimetype: "text/html",
          fileName: "cerito-cruz.html",
          caption:
            `🎮 *Cerito Cruz*\n\n` +
            `Descarga el archivo y ábrelo en tu navegador.\n` +
            `> También puedes abrirlo directo desde el link:\n🔗 ${GATO_URL}`
        }, { quoted: m });
      } catch (e) {
        return enviartexto(`❌ ${e.message}`);
      }
    }

    // ── Por defecto: enlace al juego web ──
    return sock.sendMessage(from, {
      text:
        `🎮 *Cerito Cruz — Mini Juego Web*\n\n` +
        `🕹️ Toca el enlace para abrir el juego interactivo en tu navegador:\n\n` +
        `🔗 ${GATO_URL}\n\n` +
        `✦ Modos: *Vs CPU* (imbatible) y *2 jugadores*\n` +
        `✦ Marcador, animaciones y diseño responsive\n\n` +
        `> 💾 ¿Prefieres el archivo? Usa: *${p}${cmd} doc*`,
      linkPreview: {
        "canonical-url": GATO_URL,
        "matched-text": GATO_URL,
        title: "🎮 Cerito Cruz — Juega ahora",
        description: "Tres en línea interactivo · Vs CPU y 2 jugadores"
      }
    }, { quoted: m });
  }
};