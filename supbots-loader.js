import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const SUPBOTS_DIR = path.join(process.cwd(), "SupBots");

export const supbots = new Map();

export async function loadSupbots() {
  supbots.clear();

  if (!fs.existsSync(SUPBOTS_DIR)) {
    fs.mkdirSync(SUPBOTS_DIR, { recursive: true });
    console.log("📂 Carpeta SupBots/ creada.");
    return;
  }

  const files = fs.readdirSync(SUPBOTS_DIR).filter(f => f.endsWith(".js"));
  console.log(`🤖 Cargando ${files.length} comandos de SupBots...`);

  for (const file of files) {
    try {
      const filePath = path.join(SUPBOTS_DIR, file);
      const mod = await import(pathToFileURL(filePath).href + `?t=${Date.now()}`);
      const items = Array.isArray(mod.default) ? mod.default : [mod.default];

      const registrados = [];

      for (const item of items) {
        if (!item || !item.command) {
          console.warn(`  ⚠️  ${file}: sin "command"`);
          continue;
        }

        const cmds = [item.command, ...(item.aliases || [])]
          .flat()
          .map(c => String(c).toLowerCase());

        for (const cmd of cmds) {
          if (supbots.has(cmd)) continue;
          supbots.set(cmd, { ...item, file });
        }

        registrados.push(...cmds);
      }

      if (registrados.length) {
        console.log(`  ✅ ${file} → [${registrados.map(c => "#" + c).join(", ")}]`);
      }
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
    }
  }

  console.log(`🤖 Total comandos SupBots: ${supbots.size}\n`);
}
