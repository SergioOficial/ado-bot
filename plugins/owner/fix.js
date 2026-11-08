import { exec } from "child_process";
import { loadPlugins } from "../../pluginLoader.js";

export default {
  command: ["fix", "update"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    
    await enviartexto("⏳ *Buscando actualizaciones en GitHub...*");

    // 1. Descargar la información más reciente del repositorio
    exec("git fetch origin main", (errFetch) => {
      if (errFetch) {
        return enviartexto(`❌ *Error de red al buscar actualizaciones:*\n_${errFetch.message}_`);
      }

      // 2. Forzar la actualización descargando TODO de GitHub
      exec("git reset --hard origin/main", async (errReset, stdoutReset) => {
        if (errReset) {
          return enviartexto(`❌ *Error al aplicar la actualización:*\n_${errReset.message}_`);
        }

        // 3. Recargar los plugins en memoria sin reiniciar el bot
        await loadPlugins();

        await enviartexto(
          `✅ *¡Actualización completada!*\n\n` +
          `_Todos los archivos han sido restaurados a la versión oficial de GitHub._\n` +
          `♻️ *Plugins recargados en memoria.*`
        );
      });
    });
  }
};
