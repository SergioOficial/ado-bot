import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * La versión NO se escribe aquí.
 *
 * Estaba a mano en dos sitios y se quedaron descolgadas: `package.json` decía
 * 1.1.0 (lo que se publicó en GitHub, con su etiqueta v1.1.0) y aquí seguía
 * puesto 1.0.6, así que `.info`, `.infobot`, `.estado` y `.botinfo` anunciaban
 * una versión que ya no era. Ahora hay una sola fuente y manda `package.json`:
 * para sacar una versión nueva se cambia ahí y ya lo dice todo el bot.
 */
function versionDelPaquete() {
  try {
    const raiz = path.dirname(fileURLToPath(import.meta.url));
    const paquete = JSON.parse(fs.readFileSync(path.join(raiz, "package.json"), "utf-8"));
    return String(paquete.version || "0.0.0");
  } catch {
    // Si alguien copia `config.js` suelto y no encuentra el package.json, el bot
    // tiene que arrancar igual: la versión es un adorno, no un requisito.
    return "0.0.0";
  }
}

// Configuración global.
export const config = {
  // 🔥 MULTI-PREFIJO: El bot responderá a cualquiera de estos
  prefix: [".", "#", "/", "🇨🇺"],
  
  botName: "Ado Bot",
  

  // Lista de owners (múltiples)
  owners: [
    { name: "Sergio Dev",  number: "5358090650" },
    { name: "Jeferson Fernández", number: "573005255807" },
    { name: "atencion al cliente bots", number: "50494874330" },
    { name: "Roxi", number: "5215574370309" }
  ],

  // Compatibilidad con el resto del código (index.js actual)
  ownerName: "Sergio Dev 💫",
  ownerNumber: "5358090650",

  // Sale de package.json (ver arriba).
  version: versionDelPaquete(),
  footer: "𝐀𝐝𝐨 𝐁𝐨𝐭 by Wyra Studios",

  // CLAVES DE API
  apis: {
    vihangayt: "lSq1epGYexsn4WmS"
  }
};
