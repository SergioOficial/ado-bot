import { exec } from "child_process";

export default {
  command: ["backup", "gitpush", "save"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto, m } = ctx;
    
    await enviartexto("⏳ *Iniciando backup en GitHub...*");
    const fecha = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
    const commitMsg = `🚀 Backup automático desde WhatsApp (${fecha})`;

    // 1. Añadir cambios
    exec("git add .", (errAdd) => {
      if (errAdd) return enviartexto(`❌ *Error en git add:*\n_${errAdd.message}_`);

      // 2. Hacer commit
      exec(`git commit -m "${commitMsg}"`, (errCommit, stdoutCommit) => {
        // Si no hay cambios, el commit puede fallar (exit code 1)
        const noChanges = stdoutCommit.includes("nothing to commit") || errCommit?.message?.includes("nothing to commit");
        if (noChanges) {
          return enviartexto("ꕥ *No hay cambios nuevos para guardar.*");
        }
        if (errCommit) {
          return enviartexto(`❌ *Error en git commit:*\n_${errCommit.message}_`);
        }

        // 3. Subir a GitHub
        exec("git push origin main", (errPush, stdoutPush) => {
          if (errPush) {
            return enviartexto(`❌ *Error en git push:*\n_${errPush.message}_\n\n_Asegúrate de tener configurado tu Token de GitHub._`);
          }
          enviartexto(`✅ *Backup completado con éxito.*\n\n\`\`\`\n${stdoutPush.trim()}\n\`\`\``);
        });
      });
    });
  }
};
