import { exec } from "child_process";
import { loadPlugins } from "../../pluginLoader.js";

export default {
  command: ["fix", "update"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    await enviartexto("⏳ *Buscando actualizaciones en GitHub...*");

    // 1. Descargar la información del repo sin fusionar aún
    exec("git fetch origin main", (errFetch) => {
      if (errFetch) return enviartexto(`❌ *Error de red:*\n_${errFetch.message}_`);

      // 2. Forzar la actualización (borra cambios locales en archivos modificados)
      exec("git reset --hard origin/main", async (errReset, stdoutReset) => {
        if (errReset) return enviartexto(`❌ *Error al actualizar:*\n_${errReset.message}_`);

        // 3. Recargar los plugins en memoria
        await loadPlugins();

        await enviartexto(
          `✅ *Actualización completada y forzada con éxito.*\n\n` +
          `_Los archivos locales fueron restaurados a la versión oficial de GitHub._\n` +
          `♻️ *Recargando plugins...*`
        );
      });
    });
  }
};
