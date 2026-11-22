import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * La versión NO se escribe aquí.
 *
 * Estaba a mano en dos sitios y se quedaron descolgadas: `package.json` decía
 * 1.1.3 (lo que se publicó en GitHub, con su etiqueta v1.1.3) y aquí seguía
 * puesto 1.0.6, así que `.info`, `.infobot`, `.estado` y `.botinfo` anunciaban
 * una versión que ya no era. Ahora hay una sola fuente y manda `package.json`:
 * para sacar una versión nueva se cambia ahí y ya lo dice todo el bot.
 */
/**
 * Lee `OWNERS="Nombre:número,Nombre:número"`. Devuelve null si la variable no
 * está o no trae ni un número válido, para que se use la lista de siempre.
 */
function parsearOwners(crudo) {
  if (!crudo || !String(crudo).trim()) return null;
  const lista = String(crudo)
    .split(",")
    .map((trozo) => {
      const [nombre, ...resto] = trozo.split(":");
      const numero = String(resto.join(":") || "").replace(/[^0-9]/g, "");
      if (!numero) return null;
      return { name: (nombre || "Owner").trim(), number: numero };
    })
    .filter(Boolean);
  return lista.length ? lista : null;
}

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
  prefix: [".", "#", "/", "🇨🇺","°"],
  
  botName: "𝙰𝚍𝚘𝑩𝒐𝒕",
  

  // Lista de owners (múltiples).
  //
  // Los números se pueden poner en el `.env` (ver `.env.example`), separados
  // por comas y con el formato `Nombre:número`:
  //
  //     OWNERS="Sergio Dev:5358090650,Jeferson:573005255807,Roxi:5215574370309"
  //
  // Si la variable no está, se usa esta lista. Está aquí porque el repositorio
  // es público y son tres números de teléfono reales: quien los lea puede
  // escribir por WhatsApp a los tres. Pasarlos al `.env` los saca de GitHub
  // sin cambiar el comportamiento del bot.
  owners: parsearOwners(process.env.OWNERS) || [
    { name: "Sergio Dev", number: "5358090650" },
    { name: "Jeferson Fernández", number: "573005255807" },
    { name: "Roxi", number: "5215574370309" },
  ],

  // Compatibilidad con el resto del código (index.js actual)
  ownerName: process.env.OWNER_NAME || "Sergio Dev 💫",
  ownerNumber: process.env.OWNER_NUMBER || "5358090650",

  // Sale de package.json (ver arriba).
  version: versionDelPaquete(),
  footer: "𝐀𝐝𝐨 𝐁𝐨𝐭 by Wyra Studios",

  // CLAVES DE API
  //
  // Aquí vivía una clave escrita a mano (`vihangayt`) que NO usaba ningún
  // archivo del bot: estaba en el repositorio público sin servir para nada.
  // Las claves van en el `.env`, que no se sube (ver `.gitignore`).
  apis: {
    vihangayt: process.env.VIHANGAYT_KEY || "",
  }
};
