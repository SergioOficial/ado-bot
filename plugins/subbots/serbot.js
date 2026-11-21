import fs from 'fs';
import path from 'path';
import { readFile } from "node:fs/promises";
import { enviarJuegoHtml } from "../../lib/juego-html.js";

const SUBS_DIR = path.resolve('./subs');
const htmlPath = new URL("../../juegos/code.html", import.meta.url);

export default {
  command: ["serbot", "mibots", "gestorbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, sender, config } = ctx;
    
    // 1. Obtener el número del usuario y del bot principal
    const userPhone = sender.split('@')[0];
    const botNumber = sock.user.id.split('@')[0].split(':')[0];

    // 2. Buscar los bots del usuario en la carpeta ./subs
    let listaHTML = "";
    if (fs.existsSync(SUBS_DIR)) {
      const carpetas = fs.readdirSync(SUBS_DIR);
      
      for (const carpeta of carpetas) {
        const configPath = path.join(SUBS_DIR, carpeta, 'config.json');
        if (fs.existsSync(configPath)) {
          try {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Si el bot le pertenece a este usuario
            if (cfg.owner === userPhone) {
              // Creamos los botones de acción para este bot
              listaHTML += `
                <div class="bot-item">
                  <span>📱 ${carpeta}</span>
                </div>
                <div class="btn-group" style="margin-bottom: 15px;">
                  <a href="https://wa.me/${botNumber}?text=.serbot%20estado%20${carpeta}" class="btn btn-outline">Ver Estado</a>
                  <a href="https://wa.me/${botNumber}?text=.serbot%20delete%20${carpeta}" class="btn btn-danger">Eliminar</a>
                </div>
              `;
            }
          } catch {}
        }
      }
    }

    if (!listaHTML) {
      listaHTML = `<div class="empty">No tienes bots vinculados aún.</div>`;
    }

    // 3. Leer el HTML base e inyectar las variables
    let html = await readFile(htmlPath, "utf8");
    html = html.replace(/\{\{BOT_NUMBER\}\}/g, botNumber);
    html = html.replace(/\{\{USER_PHONE\}\}/g, userPhone);
    html = html.replace(/\{\{LISTA_BOTS\}\}/g, listaHTML);

    // 4. Enviar el HTML como mini-app
    return enviarJuegoHtml(sock, from, html, "🤖 Gestor de Sub-Bots");
  }
};