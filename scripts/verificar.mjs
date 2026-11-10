/**
 * scripts/verificar.mjs — comprobaciones que NO abren WhatsApp.
 *
 * Sirve antes de cada arranque para saber si el problema es del bot o de la
 * sesión:
 *
 *   npm run verificar
 *
 * 1. Qué cliente se cargó (fork u oficial) y que traiga todo lo que el bot usa.
 * 2. Que los botones nativos se puedan armar y viajen enteros en el proto.
 * 3. Qué versión de WhatsApp Web se va a anunciar, y si es la de verdad.
 * 4. Que todos los plugins tengan sintaxis válida, y cuáles fallan.
 * 5. Que la lista de owners esté bien formada.
 */

import { readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { pathToFileURL } from "url";
import { execFileSync } from "child_process";

let fallos = 0;
const ok = (t) => console.log(`  ✅ ${t}`);
const mal = (t) => {
  fallos++;
  console.log(`  ❌ ${t}`);
};

console.log("\n─── 1. Cliente de WhatsApp ─────────────────────────────────────");
const baileys = await import("../lib/baileys.js");
ok(`paquete: ${baileys.paquete}`);

console.log("\n─── 2. Botones nativos ────────────────────────────────────────");
const { proto } = baileys;
const { rapido, copiar, enlace, respaldo } = await import("../lib/botones.js");

const contenido = proto.Message.fromObject({
  viewOnceMessage: {
    message: {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: {
        body: { text: "prueba" },
        footer: { text: "pie" },
        nativeFlowMessage: {
          buttons: [rapido("Sí", "si"), copiar("Copiar", "texto"), enlace("Abrir", "https://example.com")],
        },
      },
    },
  },
});
const bytes = proto.Message.encode(contenido).finish();
const vuelta = proto.Message.decode(bytes);
const botones = vuelta.viewOnceMessage?.message?.interactiveMessage?.nativeFlowMessage?.buttons || [];
if (botones.length === 3) ok(`3 botones armados y decodificados (${bytes.length} bytes)`);
else mal(`se esperaban 3 botones, volvieron ${botones.length}`);

const primero = JSON.parse(botones[0]?.buttonParamsJson || "{}");
if (primero.display_text === "Sí" && primero.id === "si") ok("los parámetros del botón llegan intactos");
else mal(`parámetros del botón alterados: ${botones[0]?.buttonParamsJson}`);

const respuesta = proto.Message.fromObject({
  interactiveResponseMessage: {
    nativeFlowResponseMessage: { name: "quick_reply", paramsJson: '{"id":"si"}', version: 3 },
  },
});
const leida = proto.Message.decode(proto.Message.encode(respuesta).finish());
if (leida.interactiveResponseMessage?.nativeFlowResponseMessage?.name === "quick_reply")
  ok("se puede leer qué botón pulsó la persona");
else mal("no se pudo leer la respuesta del botón");

if (respaldo("cuerpo", [{ texto: "A" }]).includes("▸ A")) ok("respaldo en texto para clientes sin botones");
else mal("el respaldo en texto no se genera");

console.log("\n─── 3. Versión de WhatsApp Web ────────────────────────────────");
const { versionParaLog } = await import("../lib/wa-version.js");
const v = await versionParaLog((m) => console.log(`  · ${m}`));
console.log(`  ${v.texto}`);
if (v.version) ok(`versión: ${v.version.join(".")} (fuente: ${v.fuente})`);
else mal("no se pudo determinar la versión");

console.log("\n─── 4. Plugins: sintaxis ──────────────────────────────────────");
const raiz = join(process.cwd(), "plugins");
function recorrer(dir, salida = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) recorrer(p, salida);
    else if (f.endsWith(".js")) salida.push(p);
  }
  return salida;
}
const archivos = recorrer(raiz);
const rotos = [];
for (const f of archivos) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
  } catch (err) {
    rotos.push(`${relative(process.cwd(), f)}: ${String(err.stderr || err.message).split("\n")[0]}`);
  }
}
if (rotos.length === 0) ok(`${archivos.length} plugins con sintaxis válida`);
else {
  mal(`${rotos.length} de ${archivos.length} plugins con errores:`);
  for (const r of rotos) console.log(`     · ${r}`);
}

console.log("\n─── 5. Owners ─────────────────────────────────────────────────");
const { config } = await import("../config.js");
const owners = config.owners || [];
if (!owners.length) mal("no hay ningún owner configurado: los comandos de dueño no los podrá usar nadie");
else {
  const malos = owners.filter((o) => !/^\d{8,15}$/.test(String(o.number || "").replace(/\D/g, "")));
  if (malos.length) mal(`owners con número inválido: ${malos.map((o) => o.name || o.number).join(", ")}`);
  else ok(`${owners.length} owners: ${owners.map((o) => `${o.name} (${o.number})`).join(" · ")}`);
}

console.log("\n─── 6. Plugins: carga real ────────────────────────────────────");
// Importarlos de verdad (no solo comprobar sintaxis) es lo que caza lo que
// rompe al cambiar de cliente: un import que ya no existe, un helper que se
// movió de sitio. No abre WhatsApp: solo evalúa el módulo.
let cargados = 0;
const noCargan = [];
for (const f of archivos) {
  try {
    const mod = await import(pathToFileURL(f).href);
    const p = mod.default;
    if (!p || (!p.command && !p.event)) {
      noCargan.push(`${relative(process.cwd(), f)}: no exporta command ni event`);
      continue;
    }
    cargados++;
  } catch (err) {
    noCargan.push(`${relative(process.cwd(), f)}: ${err.message.split("\n")[0]}`);
  }
}
if (noCargan.length === 0) ok(`${cargados} plugins cargan y exportan lo suyo`);
else {
  mal(`${noCargan.length} plugin(s) no cargan:`);
  for (const r of noCargan) console.log(`     · ${r}`);
}

console.log(fallos === 0 ? "\n✅ Todo en orden.\n" : `\n❌ ${fallos} comprobación(es) fallaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
