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
import { existsSync } from "fs";
import { join, relative } from "path";
import { pathToFileURL } from "url";
import { execFileSync } from "child_process";

// Sin dependencias instaladas no se puede comprobar nada: mejor decirlo claro
// que escupir una traza de «módulo no encontrado».
if (!existsSync(join(process.cwd(), "node_modules"))) {
  console.error("⚠️  Falta node_modules. Ejecuta primero:  npm install");
  process.exit(1);
}

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

console.log("\n─── 7. Botón pulsado → comando ────────────────────────────────");
const { botonPulsado } = await import("../lib/botones.js");
const respuestaBoton = {
  message: {
    interactiveResponseMessage: {
      nativeFlowResponseMessage: { name: "quick_reply", paramsJson: '{"id":"menu economia"}', version: 3 },
    },
  },
};
const pulsado = botonPulsado(respuestaBoton);
const comoComando = `.${{ ...pulsado }.id}`;
if (pulsado?.id === "menu economia" && comoComando === ".menu economia")
  ok(`un botón se convierte en comando: "${comoComando}"`);
else mal(`no se pudo leer el botón: ${JSON.stringify(pulsado)}`);

// Los botones que manda el menú tienen que apuntar a categorías que existan, y
// el mensaje tiene que salir con los nodos binarios: sin ellos WhatsApp acepta
// el mensaje y el teléfono no pinta nada (ni error, ni aviso).
const { readFileSync: leer } = await import("fs");
const fuenteMenu = leer(join(process.cwd(), "plugins", "info", "menu.js"), "utf8");
const categorias = new Set([...fuenteMenu.matchAll(/tipo\s*===\s*'([a-z]+)'/g)].map((m) => m[1]));

// Botones rápidos: rapido("Texto", `${comando} categoria`)
const rapidos = [...fuenteMenu.matchAll(/rapido\([^,]+,\s*[`"]\$\{comando\}\s+([a-z]+)[`"]/g)].map((m) => m[1]);
// Filas de la lista desplegable: { id: `${comando} categoria`, ... }
const filas = [...fuenteMenu.matchAll(/id:\s*`\$\{comando\}\s+([a-z]+)`/g)].map((m) => m[1]);
const destinos = [...new Set([...rapidos, ...filas])];
const destinosRotos = destinos.filter((c) => !categorias.has(c));

if (destinos.length && !destinosRotos.length) {
  ok(`${destinos.length} destino(s) de botón del menú existen (${destinos.join(", ")})`);
} else if (destinosRotos.length) {
  mal(`el menú apunta a categorías que no existen: ${destinosRotos.join(", ")}`);
} else {
  console.log("  · el menú no manda botones (no es un error)");
}

const fuenteBotones = leer(join(process.cwd(), "lib", "botones.js"), "utf8");
if (fuenteBotones.includes("additionalNodes: nodosInteractivos")) {
  ok("los botones salen con los nodos binarios (biz → interactive → native_flow)");
} else {
  mal("los botones se mandan SIN nodos binarios: el teléfono no los pintaría");
}
if (!/viewOnceMessage:\s*\{\s*message:\s*interactivo/.test(fuenteBotones.split("const contenido")[1] || "")) {
  ok("el interactivo no va envuelto en viewOnceMessage (botones grises en WhatsApp Web)");
}

