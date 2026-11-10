import { exec } from "child_process";
import fs from "fs";
import { BASE_DATOS } from "../../lib/rutas.js";

export default {
  command: ["fix", "update"],
  isOwner: true, // Solo tú y los owners pueden usarlo
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    
    await enviartexto("⏳ *Buscando actualizaciones en GitHub...*");

    try {
      // 1. Respaldar la base de datos para no perder a los usuarios ni las configuraciones de los grupos
      // La base real está en lib/database.json (ver lib/rutas.js). Antes se
      // respaldaba ./database.json, que no existe: el «respaldo» era null.
      const dbBackup = fs.existsSync(BASE_DATOS) ? fs.readFileSync(BASE_DATOS, "utf8") : null;

      // 2. Descargar la información más reciente del repositorio
      exec("git fetch origin main", (errFetch) => {
        if (errFetch) {
          return enviartexto(`❌ *Error de red al buscar actualizaciones:*\n_${errFetch.message}_`);
        }

        // 3. Forzar la actualización de TODO el código (incluyendo el index.js si lo cambiaste en GitHub)
        exec("git reset --hard origin/main", (errReset) => {
          if (errReset) {
            return enviartexto(`❌ *Error al aplicar la actualización:*\n_${errReset.message}_`);
          }

          // 4. Restaurar la base de datos
          try {
            if (dbBackup) fs.writeFileSync(BASE_DATOS, dbBackup);
          } catch (e) {
            console.error("Error al restaurar la base de datos:", e);
          }

          // 5. Avisar al usuario y reiniciar el proceso
          enviartexto(
            `✅ *¡Actualización completada!*\n\n` +
            `_El código ha sido sincronizado con GitHub._\n` +
            `_La base de datos está a salvo._\n\n` +
            `♻️ *Reiniciando el bot para aplicar los cambios...*`
          ).then(() => {
            // process.exit(0) cierra el bot. 
            // En hostings (BotKeep, Railway, PM2), el sistema lo reinicia solo en 2 segundos.
            setTimeout(() => {
              process.exit(0);
            }, 2000);
          });
        });
      });
    } catch (error) {
      await enviartexto(`❌ Error inesperado: ${error.message}`);
    }
  }
};