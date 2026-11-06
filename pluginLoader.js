import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const PLUGINS_DIR = path.join(process.cwd(), "plugins");
export const commands = new Map();

export async function loadPlugins() {
  commands.clear();
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    return;
  }

  console.log("🔌 Cargando plugins...");

  async function readFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      
      if (fs.lstatSync(fullPath).isDirectory()) {
        await readFolder(fullPath); // Si es carpeta, entra recursivamente
      } else if (file.endsWith(".js")) {
        try {
          // ?t=Date.now() evita que Node guarde el módulo en caché
          const mod = await import(pathToFileURL(fullPath).href + `?t=${Date.now()}`);
          const plugin = mod.default;
          
          if (!plugin || !plugin.command) continue;
          
          const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
          
          for (const cmd of cmds) {
            if (commands.has(cmd.toLowerCase())) {
              console.warn(`⚠️ Comando duplicado: #${cmd} en ${file}`);
              continue;
            }
            commands.set(cmd.toLowerCase(), plugin);
          }
        } catch (err) {
          console.error(`❌ Error cargando ${file}:`, err.message);
        }
      }
    }
  }

  await readFolder(PLUGINS_DIR);
  console.log(`🔌 Total comandos cargados: ${commands.size}\n`);
}
