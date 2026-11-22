/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * scripts/auditar-antiban.mjs — busca los sitios por donde un mensaje puede
 * salir SIN pasar por la cola del anti-ban.
 *
 * POR QUÉ EXISTE
 * --------------
 * `lib/antiban.js` envuelve el socket: todo lo que salga por `sendMessage` o
 * `relayMessage` espera turno, enciende el «escribiendo…», cuenta para el tope
 * diario y respeta la curva circadiana. Pero eso solo cubre lo que pasa por ese
 * socket. Un plugin que abra su propio socket, que escriba al websocket a mano o
 * que mande en bucle con una espera fija se salta el freno entero.
 *
 * Esto no adivina: lee el código y señala patrones. Lo que encuentra no es
 * siempre un error —`sonda` habla con el servidor a propósito para diagnosticar,
 * y un ranking que lee `db.users` para sumar puntos no manda nada—, así que el
 * informe separa lo que manda mensajes de lo que solo recorre datos.
 *
 * Uso:
 *   node scripts/auditar-antiban.mjs              informe legible
 *   node scripts/auditar-antiban.mjs --md         escribe docs/ANTIBAN.md
 *   node scripts/auditar-antiban.mjs --estricto   sale con 1 si hay hallazgos
 *                                                 graves en plugins
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARPETAS = ["plugins", "lib", "boot"];

/** Dónde sí se toca el transporte: es el sitio que lo implementa. */
const PERMITIDO = new Set([
  "lib/antiban.js",
  "lib/botones.js",
  "lib/juego-html.js",
  "lib/encuestas.js",
  "lib/album.js",
  "boot/subbots.js",
  "boot/arranque.js",
  "boot/vigilantes.js",
  "index.js",
]);

/** Quién manda de verdad un mensaje (no solo lee la base). */
const ENVIA = /\.sendMessage\s*\(|\.relayMessage\s*\(|sendRawMessage\s*\(/;

function archivos(carpeta) {
  const salida = [];
  let entradas;
  try {
    entradas = readdirSync(carpeta);
  } catch {
    return salida;
  }
  for (const nombre of entradas) {
    if (nombre === "node_modules" || nombre.startsWith(".")) continue;
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(js|mjs)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/** Número de línea de una posición del texto. */
function lineaDe(codigo, indice) {
  return codigo.slice(0, indice).split("\n").length;
}

/**
 * Cuerpos de bucle del archivo: `{ pos, cuerpo, cabecera }`.
 *
 * `for (...)`, `while (...)` y `X.forEach(...)`: para cada uno se busca la llave
 * que abre el bloque y se cuenta hasta la que lo cierra. Los bucles de una sola
 * instrucción sin llaves se dejan fuera: en este proyecto no hay ninguno que
 * mande mensajes, y avisar de todos sería ruido.
 */
function cuerposDeBucle(codigo) {
  const salida = [];
  const abre = /(?:^|[^\w$.])(for|while)\s*\(|\.(?:forEach|map|flatMap)\s*\(/g;
  let m;
  while ((m = abre.exec(codigo))) {
    // Desde el paréntesis de apertura, salta su pareja.
    let i = codigo.indexOf("(", m.index + (m[1] ? m[1].length : m[0].length - 1));
    if (m[1]) i = m.index + m[0].lastIndexOf("(");
    let nivel = 0;
    let finParen = -1;
    for (let j = i; j < codigo.length; j++) {
      if (codigo[j] === "(") nivel++;
      else if (codigo[j] === ")") {
        nivel--;
        if (nivel === 0) {
          finParen = j;
          break;
        }
      }
    }
    if (finParen < 0) continue;
    let k = finParen + 1;
    while (k < codigo.length && /\s/.test(codigo[k])) k++;
    if (codigo[k] !== "{") continue;
    let nivelLlave = 0;
    let finCuerpo = -1;
    for (let j = k; j < codigo.length; j++) {
      if (codigo[j] === "{") nivelLlave++;
      else if (codigo[j] === "}") {
        nivelLlave--;
        if (nivelLlave === 0) {
          finCuerpo = j;
          break;
        }
      }
    }
    if (finCuerpo < 0) continue;
    salida.push({
      pos: k,
      cabecera: codigo.slice(m.index, finParen + 1),
      cuerpo: codigo.slice(k, finCuerpo + 1),
    });
  }
  return salida;
}

const hallazgos = [];

function anotar({ id, gravedad, archivo, codigo, indice, que, porque, destinatarios }) {
  hallazgos.push({
    id,
    gravedad,
    archivo,
    linea: lineaDe(codigo, indice),
    que,
    porque,
    destinatarios: destinatarios || "",
    permitido: PERMITIDO.has(archivo),
  });
}

for (const carpeta of CARPETAS) {
  for (const ruta of archivos(join(RAIZ, carpeta))) {
    const archivo = relative(RAIZ, ruta).replace(/\\/g, "/");
    const codigo = readFileSync(ruta, "utf8");

    // ── Socket propio ────────────────────────────────────────────────────────
    const socketPropio = /makeWASocket\s*\(/.exec(codigo);
    if (socketPropio) {
      anotar({
        id: "socket-propio",
        gravedad: "grave",
        archivo,
        codigo,
        indice: socketPropio.index,
        que: "abre su propio socket de WhatsApp",
        porque: "un socket nuevo es una conexión que no pasa por la cola ni por el tope diario.",
      });
    }

    // ── WebSocket crudo ──────────────────────────────────────────────────────
    for (const re of [/\.ws\.(?:send|close)\b/g, /\bsendRawMessage\s*\(/g, /\bexecuteWMexQuery\b/g]) {
      let m;
      while ((m = re.exec(codigo))) {
        const indice = m.index;
        const lineaTexto = codigo.slice(codigo.lastIndexOf("\n", indice) + 1, codigo.indexOf("\n", indice));
        if (/^\s*(?:\*|\/\/)/.test(lineaTexto)) continue;
        anotar({
          id: "websocket-crudo",
          gravedad: "grave",
          archivo,
          codigo,
          indice,
          que: "escribe en el websocket a mano",
          porque: "ese mensaje sale sin espera, sin «escribiendo…» y sin contar para el tope.",
        });
      }
    }

    // ── relayMessage a mano ──────────────────────────────────────────────────
    for (const re of [/\.relayMessage\s*\(/g]) {
      let m;
      while ((m = re.exec(codigo))) {
        anotar({
          id: "relay-directo",
          gravedad: "medio",
          archivo,
          codigo,
          indice: m.index,
          que: "usa relayMessage a mano",
          porque: "sí pasa por el envoltorio del socket, pero salta la ruta normal de mensajes.",
        });
      }
    }

    // ── Estados de WhatsApp ──────────────────────────────────────────────────
    const est = /status@broadcast/.exec(codigo);
    if (est) {
      anotar({
        id: "estado",
        gravedad: "grave",
        archivo,
        codigo,
        indice: est.index,
        que: "publica en los estados de WhatsApp",
        porque: "publicar estados automáticos es una causa frecuente de restricción.",
      });
    }

    // ── Bucles que mandan ────────────────────────────────────────────────────
    for (const bucle of cuerposDeBucle(codigo)) {
      const envio = ENVIA.exec(bucle.cuerpo);
      if (!envio) continue;
      const masivo = /db\.users|db\.chats|participants|miembros|subbots|usuarios/.test(
        bucle.cabecera + bucle.cuerpo
      );
      anotar({
        id: masivo ? "envio-masivo" : "bucle-de-envio",
        gravedad: "grave",
        archivo,
        codigo,
        indice: bucle.pos + envio.index,
        que: masivo ? "manda un mensaje por cada destinatario de una lista" : "manda dentro de un bucle",
        porque: masivo
          ? "escribir a una lista entera es el patrón que WhatsApp llama «mensajería masiva»."
          : "un bucle de envíos sale en ráfaga si nadie lo frena.",
        destinatarios: masivo ? "varios" : "",
      });
    }

    // ── Ráfagas en paralelo ──────────────────────────────────────────────────
    // `Promise.all([...sendMessage...])` sale todo de golpe: la cola lo ordena,
    // pero el pico de mensajes en un segundo se nota igual.
    const rafaga = /Promise\.all\s*\(\s*\[[\s\S]{0,600}?\.sendMessage\s*\(/.exec(codigo);
    if (rafaga) {
      anotar({
        id: "rafaga",
        gravedad: "medio",
        archivo,
        codigo,
        indice: rafaga.index,
        que: "manda varios mensajes a la vez",
        porque: "una ráfaga en paralelo llega toda junta; la cola la ordena, pero el pico se nota.",
      });
    }
  }
}

const fuera = hallazgos.filter((h) => !h.permitido);
const gravesFuera = fuera.filter((h) => h.gravedad === "grave");

export function informe() {
  const L = [];
  L.push("# Por dónde puede salirse el anti-ban", "");
  L.push(
    "_Generado con `npm run auditar-antiban`. Señala los sitios que mandan mensajes sin pasar por la cola de `lib/antiban.js`._",
    ""
  );
  L.push(`- Archivos con algún hallazgo: **${new Set(hallazgos.map((h) => h.archivo)).size}**`);
  L.push(`- Hallazgos fuera de los sitios que implementan el transporte: **${fuera.length}**`);
  L.push(`- De esos, graves: **${gravesFuera.length}**`, "");

  if (!fuera.length) {
    L.push("## Sin hallazgos", "", "Ningún archivo fuera de `lib/` y `boot/` manda por su cuenta.", "");
  } else {
    L.push("## Hallazgos a revisar", "", "| Archivo | Línea | Qué hace | Por qué importa |", "|---|---|---|---|");
    for (const h of fuera.sort((a, b) => a.archivo.localeCompare(b.archivo) || a.linea - b.linea)) {
      L.push(`| \`${h.archivo}\` | ${h.linea} | ${h.que} | ${h.porque} |`);
    }
    L.push("");
  }

  const dentro = [...new Set(hallazgos.filter((h) => h.permitido).map((h) => h.archivo))].sort();
  L.push("## Los sitios que sí implementan el transporte", "");
  L.push(dentro.length ? dentro.map((a) => `- \`${a}\``).join("\n") : "_ninguno_", "");
  // Las notas escritas a mano viven en docs/antiban-notas.md y se pegan aquí:
  // así el informe se puede regenerar sin perder la revisión de cada hallazgo.
  const notas = join(RAIZ, "docs", "antiban-notas.md");
  if (existsSync(notas)) {
    L.push(readFileSync(notas, "utf8").trimEnd(), "");
  }

  L.push("## Lo que este informe no dice", "");
  L.push(
    "No mide el riesgo de una cuenta ni promete que no la restrinjan: señala los caminos por los que un mensaje puede salir sin freno. Un archivo limpio aquí sigue pudiendo mandar cien mensajes seguidos si alguien se lo pide; para eso está el tope diario de `lib/antiban.js`.",
    ""
  );
  return L.join("\n");
}

const modo = process.argv[2] || "";
if (modo === "--md") {
  const destino = join(RAIZ, "docs", "ANTIBAN.md");
  writeFileSync(destino, informe(), "utf8");
  console.log(`📄 ${relative(RAIZ, destino)} escrito · ${fuera.length} hallazgo(s), ${gravesFuera.length} grave(s)`);
} else {
  console.log(informe());
}

if (modo === "--estricto") {
  const gravesEnPlugins = gravesFuera.filter((h) => h.archivo.startsWith("plugins/"));
  if (gravesEnPlugins.length) {
    console.error(`\n❌ ${gravesEnPlugins.length} hallazgo(s) grave(s) en plugins.`);
    process.exit(1);
  }
  console.log("\n✓ Sin hallazgos graves en plugins.");
}
