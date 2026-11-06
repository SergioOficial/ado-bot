import { exec } from "child_process";
import { loadPlugins, commands } from "../../pluginLoader.js";
export default {
  command: ["fix", "update"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    await enviartexto("⏳ *Actualizando desde GitHub...*");
    exec("git pull", async (error, stdout) => {
      if (error) return enviartexto(`❌ *Error de Git:*\n_${error.message}_`);
      await loadPlugins();
      if (stdout.includes("Already up to date.")) return enviartexto("ꕥ *Todo está actualizado.*");
      await enviartexto(`✅ *Actualizado:*\n\`\`\`\n${stdout}\n\`\`\`\n♻️ *Recargando plugins...*`);
    });
  }
};
