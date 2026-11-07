import fs from "fs";
import path from "path";

export default {
  command: ["clear", "limpiar"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    const tmpDir = "./tmp";

    if (!fs.existsSync(tmpDir)) return enviartexto("✅ La carpeta temporal ya está vacía.");

    try {
      const files = fs.readdirSync(tmpDir);
      let eliminados = 0;

      for (const file of files) {
        fs.unlinkSync(path.join(tmpDir, file));
        eliminados++;
      }

      await enviartexto(`🧹 *Limpieza completada.*\nSe eliminaron *${eliminados}* archivos temporales.`);
    } catch (e) {
      console.error("Error en clear:", e.message);
      await enviartexto(`❌ Error al limpiar la carpeta: ${e.message}`);
    }
  }
};
