/**
 * Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE
 * scripts/probar.mjs — corre todas las pruebas que NO abren WhatsApp.
 *
 *   npm run probar
 *
 * Cada archivo de pruebas/pruebas/*.test.mjs exporta `pruebas`: una lista de
 * [nombre, función]. Si una función lanza, esa prueba falla y se sigue con las
 * demás, para ver todo lo roto de una vez.
 */
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const dir = join(process.cwd(), "pruebas");
const archivos = readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort();

let pasan = 0;
const fallan = [];

for (const archivo of archivos) {
  const mod = await import(pathToFileURL(join(dir, archivo)).href);
  console.log(`\n📄 ${archivo}`);
  for (const [nombre, fn] of mod.pruebas || []) {
    try {
      await fn();
      pasan++;
      console.log(`  ✅ ${nombre}`);
    } catch (err) {
      fallan.push(`${archivo} · ${nombre}: ${err.message}`);
      console.log(`  ❌ ${nombre}\n     ${err.message}`);
    }
  }
}

console.log(`\n${pasan} pruebas pasan · ${fallan.length} fallan`);
process.exit(fallan.length ? 1 : 0);
