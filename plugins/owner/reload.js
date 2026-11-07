import { loadPlugins } from "../../pluginLoader.js";

export default {
  command: ["reload", "recargar"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    
    await enviartexto("♻️ *Recargando plugins locales...*");
    
    try {
      await loadPlugins();
      await enviartexto("✅ *¡Plugins recargados en memoria!*\n\nTus cambios locales ya están activos.");
    } catch (error) {
      await enviartexto(`❌ Error al recargar: ${error.message}`);
    }
  }
};
