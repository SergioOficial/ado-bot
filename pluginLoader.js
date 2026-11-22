import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const PLUGINS_DIR = path.join(process.cwd(), "plugins");
export const commands = new Map();
export const events = new Map(); // 👈 Nuevo: Almacén de eventos

export async function loadPlugins() {
  commands.clear();
  events.clear();
  
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });

  console.log("🔌 Cargando plugins...");

  async function readFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        await readFolder(fullPath);
      } else if (file.endsWith(".js")) {
        try {
          const mod = await import(pathToFileURL(fullPath).href + `?t=${Date.now()}`);
          const plugin = mod.default;
          if (!plugin) continue;

          // De qué carpeta sale cada plugin: lo usa el menú para agrupar por
          // categoría sin tener que mantener una lista a mano.
          plugin.carpeta ||= path.basename(path.dirname(fullPath));
          plugin.archivo ||= file.replace(/\.js$/, "");

          // Si es un comando
          if (plugin.command) {
            const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
            for (const cmd of cmds) commands.set(cmd.toLowerCase(), plugin);
          }

          // Si es un evento (ej. welcome, antilink)
          if (plugin.event) {
            if (!events.has(plugin.event)) events.set(plugin.event, []);
            events.get(plugin.event).push(plugin);
          }
        } catch (err) {
          console.error(`❌ Error cargando ${file}:`, err.message);
        }
      }
    }
  }

  await readFolder(PLUGINS_DIR);
  console.log(`🔌 Comandos: ${commands.size} | Eventos: ${events.size}\n`);
}
