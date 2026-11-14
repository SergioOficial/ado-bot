/**
 * lib/gacha.js — lo que comparten todos los comandos de gacha.
 *
 * POR QUÉ ESTÁ AQUÍ Y NO EN CADA PLUGIN
 * -------------------------------------
 * Los seis comandos (rw, claim, harem, wtop, charinfo y el interruptor) leen el
 * mismo `lib/characters.json`, buscan en las mismas dos APIs y descargan la
 * misma clase de imágenes. Tenerlo una vez evita que uno arregle la búsqueda y
 * los otros cinco se queden con la vieja.
 *
 * LAS CUATRO COSAS QUE SE ARREGLARON AQUÍ (medidas, no supuestas)
 * ---------------------------------------------------------------
 * 1. **El archivo se lee una vez.** Son 2.473 personajes en 124 series (≈500
 *    KB). Antes cada `.rw` lo parseaba entero: ahora queda en memoria y solo se
 *    relee si cambia la fecha del archivo, así que editarlo en caliente sigue
 *    funcionando.
 * 2. **Danbooru no rechaza al bot.** Contestaba **403** a todo porque se le
 *    hablaba con el User-Agent de un navegador. Con un User-Agent que dice
 *    quién llama y a dónde escribir, responde 200. El respaldo estaba muerto y
 *    no se notaba: Safebooru tapaba el hueco casi siempre.
 * 3. **La imagen se descarga con su Referer.** Safebooru y Danbooru no sirven
 *    el archivo a quien llega sin decir de dónde viene; si se le pasa la URL
 *    pelada a `sendMessage`, la descarga la hace la librería por su cuenta y el
 *    resultado es un mensaje sin imagen o un error a mitad del envío.
 * 4. **Se manda la muestra, no el original.** El `file_url` de Safebooru es el
 *    dibujo a tamaño completo: hay originales de 3000 px que no terminan de
 *    bajar en 10 segundos (medido: tres de ocho descargas expiraban, y de ahí
 *    salían los `.rw` de 16 y 18 segundos). El `sample_url` es la misma imagen
 *    a 850 px, baja en 300-900 ms y en el chat se ve igual.
 * 5. **Toda la tirada tiene un tope de tiempo.** Antes, si un personaje no
 *    traía fotos, se probaban tres tag × dos proveedores × dos descargas, cada
 *    una con su propio plazo: 16 segundos y más de espera con el dedo en el
 *    chat (medido). Ahora hay un presupuesto único por tirada, cada petición se
 *    corta con lo que quede de ese presupuesto, y los proveedores que fallan se
 *    saltan unos minutos en vez de reintentarlos en cada comando.
 */

import fs from "fs";
import { PERSONAJES } from "./rutas.js";

/** Presupuesto total de una tirada: búsqueda + descarga + compresión. */
const PRESUPUESTO = 12_000;

/** Plazo de cada búsqueda. Si tarda más, ese proveedor queda marcado un rato. */
const PLAZO_BUSQUEDA = 6_000;

/** Plazo de cada descarga. */
const PLAZO_DESCARGA = 5_000;

/** Tope de peso: una imagen de gacha no debería pasar de aquí. */
const PESO_MAXIMO = 8 * 1024 * 1024;

/** Lado máximo al que se reduce la imagen antes de mandarla. */
const LADO_MAXIMO = 900;

/** Cuánto se recuerdan las URLs de un tag (evita repetir la búsqueda). */
const VIDA_CACHE = 10 * 60 * 1000;

/** Cuánto se salta un proveedor que acaba de fallar. */
const CASTIGO = 5 * 60 * 1000;

/**
 * User-Agent para las APIs: dice quién es y dónde reclamar, que es lo que piden
 * Danbooru y compañía. Con el de un navegador, Danbooru contesta 403.
 */
const AGENTE_API = "ado-bot/1.0 (+https://github.com/SergioOficial/ado-bot)";

/** User-Agent para las imágenes: estos CDN sí esperan uno de navegador. */
const AGENTE_IMAGEN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ── estado en memoria ───────────────────────────────────────────────────────

let cachePersonajes = { json: null, fecha: 0 };
const cacheUrls = new Map(); // tag → { urls, cuando }
const castigados = new Map(); // proveedor → hasta cuándo no se le llama

/** Diagnóstico: `GACHA_DEBUG=1` escribe en consola en qué se fue el tiempo. */
function traza(...partes) {
  if (String(process.env.GACHA_DEBUG ?? "") !== "1") return;
  console.log("🎴", ...partes);
}

/** ¿Queda tiempo del presupuesto? */
function queda(limite) {
  return Math.max(0, limite - Date.now());
}

/** Plazo real de una petición: el suyo, pero nunca más que el presupuesto. */
function plazoDe(limite, propio) {
  return Math.max(300, Math.min(propio, queda(limite)));
}

// ── el archivo de personajes ────────────────────────────────────────────────

/**
 * Lee (o devuelve de memoria) `lib/characters.json`.
 *
 * La fecha del archivo es la que manda: si alguien lo edita, el siguiente
 * comando lo ve sin reiniciar el bot.
 */
export async function cargarPersonajes() {
  const info = await fs.promises.stat(PERSONAJES).catch(() => null);
  if (!info) return {};
  if (cachePersonajes.json && info.mtimeMs === cachePersonajes.fecha) return cachePersonajes.json;

  const texto = await fs.promises.readFile(PERSONAJES, "utf-8");
  try {
    cachePersonajes = { json: JSON.parse(texto), fecha: info.mtimeMs };
  } catch (err) {
    // Un JSON roto no puede tumbar `.rw` para siempre: se avisa y se sigue con
    // lo que hubiera en memoria.
    console.error(`⚠️  lib/characters.json no se pudo leer: ${err.message}`);
    return cachePersonajes.json || {};
  }
  return cachePersonajes.json;
}

/**
 * Todos los personajes en una lista plana, con el nombre de su serie pegado.
 * Los ids repetidos se quedan una sola vez (en el archivo hay tres).
 */
export function aplanar(json) {
  const vistos = new Set();
  const salida = [];
  for (const [serie, datos] of Object.entries(json || {})) {
    for (const personaje of datos?.characters || []) {
      const id = String(personaje?.id ?? "");
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      salida.push({ ...personaje, id, serie: datos?.name || serie });
    }
  }
  return salida;
}

/** De qué serie es un personaje. */
export function serieDe(json, id) {
  const buscado = String(id);
  const entrada = Object.entries(json || {}).find(([, datos]) =>
    (datos?.characters || []).some((c) => String(c.id) === buscado)
  );
  return entrada?.[1]?.name || "Desconocido";
}

/** «Aru (Blue Archive) » → «aru_(blue_archive)», que es como se busca. */
export function normalizarTag(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "_");
}

// ── buscar imágenes ─────────────────────────────────────────────────────────

/** Encabezado que cada sitio espera para dejarte bajar el archivo. */
function refererDe(url) {
  if (url.includes("safebooru.org")) return "https://safebooru.org/";
  if (url.includes("danbooru.donmai.us")) return "https://danbooru.donmai.us/";
  return "";
}

function esImagenValida(url) {
  return typeof url === "string" && /^https?:\/\//.test(url) && /\.(jpe?g|png)(\?|$)/i.test(url);
}

/**
 * Ordena las candidatas por lo que tarda en llegar.
 *
 * Un png de 4000 px puede pesar 10 MB (medido: hubo tiradas de 12 s por esto) y
 * en el chat se ve igual que uno de 900. Primero los .jpg, después los que
 * tienen un tamaño razonable, y los gigantes al final por si no queda otra.
 */
function ordenarPorPeso(candidatas) {
  const puntuar = (c) => {
    const esJpg = /\.jpe?g(\?|$)/i.test(c.url) ? 0 : 10;
    const muestra = c.muestra ? 0 : 5;
    const ancho = Number(c.ancho) || 0;
    let tamano = 0;
    if (ancho > 2500) tamano = 20;
    else if (ancho > 1600) tamano = 8;
    else if (ancho && ancho < 500) tamano = 3;
    return muestra + esJpg + tamano;
  };
  return [...candidatas].sort((a, b) => puntuar(a) - puntuar(b));
}

/**
 * Un proveedor concreto. Devuelve la lista de URLs o `[]`.
 *
 * Si falla (plazo agotado, 403, HTML en vez de JSON) el proveedor queda
 * castigado unos minutos: no tiene sentido volver a esperar 6 segundos en el
 * siguiente `.rw` para recibir lo mismo.
 */
async function proveedor(nombre, url, limite) {
  if ((castigados.get(nombre) || 0) > Date.now()) return [];

  try {
    const res = await fetch(url, {
      headers: { "user-agent": AGENTE_API, accept: "application/json" },
      signal: AbortSignal.timeout(plazoDe(limite, PLAZO_BUSQUEDA)),
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) castigados.set(nombre, Date.now() + CASTIGO);
      return [];
    }

    const tipo = res.headers.get("content-type") || "";
    if (!tipo.includes("json")) return []; // Safebooru contesta HTML cuando no le gusta la búsqueda

    // Safebooru devuelve 200 con el cuerpo vacío cuando no hay resultados: eso
    // no es un fallo del sitio, es que ese tag no existe.
    const texto = await res.text();
    if (!texto.trim()) return [];

    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      return [];
    }
    const lista = Array.isArray(json) ? json : json?.post || json?.data || [];

    const candidatas = [];
    const vistos = new Set();
    for (const p of lista) {
      // La muestra (850 px) antes que el original: pesa diez veces menos y en el
      // chat no se nota la diferencia.
      const original = p?.file_url || p?.large_file_url || p?.image || p?.media_asset?.variants?.[0]?.url;
      const muestra = p?.sample_url || p?.large_file_url;
      const url = esImagenValida(muestra) ? muestra : original;
      if (!esImagenValida(url) || vistos.has(url)) continue;

      vistos.add(url);
      candidatas.push({
        url,
        muestra: url === muestra,
        ancho: Number(p?.sample_width || p?.width || p?.image_width || 0) || 0,
        alto: Number(p?.sample_height || p?.height || p?.image_height || 0) || 0,
      });
    }

    castigados.delete(nombre);
    return candidatas;
  } catch (err) {
    // Solo se castiga al proveedor cuando de verdad falla (plazo agotado o red
    // caída). Un tag sin resultados no es culpa suya.
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      castigados.set(nombre, Date.now() + CASTIGO);
    }
    return [];
  }
}

/**
 * Imágenes de un tag. Safebooru primero (sin clave y con más series), Danbooru
 * de respaldo; las dos se preguntan a la vez para no sumar esperas, y se usa la
 * de Safebooru si trajo algo.
 */
export async function buscarImagenes(tag, limite = Date.now() + PLAZO_BUSQUEDA) {
  const consulta = normalizarTag(tag);
  if (!consulta) return [];
  const t0 = Date.now();

  const guardado = cacheUrls.get(consulta);
  if (guardado && Date.now() - guardado.cuando < VIDA_CACHE) return guardado.urls;

  const [safebooru, danbooru] = await Promise.all([
    proveedor(
      "safebooru",
      `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeURIComponent(
        `${consulta} rating:general`
      )}`,
      limite
    ),
    proveedor(
      "danbooru",
      `https://danbooru.donmai.us/posts.json?limit=100&tags=${encodeURIComponent(`${consulta} rating:g`)}`,
      limite
    ),
  ]);

  const candidatas = ordenarPorPeso(safebooru.length ? safebooru : danbooru);
  traza(
    `buscar ${consulta}: safebooru=${safebooru.length} danbooru=${danbooru.length} ` +
      `→ ${candidatas.length} en ${Date.now() - t0}ms`
  );
  if (candidatas.length) cacheUrls.set(consulta, { urls: candidatas, cuando: Date.now() });
  return candidatas;
}

// ── bajar la imagen ─────────────────────────────────────────────────────────

/**
 * Baja la imagen a memoria, con Referer y con plazo.
 *
 * Devuelve `{ buffer, tipo, url }` o lanza un error con motivo (para que el
 * comando pueda decirlo en vez de mandar un mensaje vacío).
 */
export async function descargarImagen(url, limite = Date.now() + PLAZO_DESCARGA, senal = null) {
  const reloj = AbortSignal.timeout(plazoDe(limite, PLAZO_DESCARGA));
  const res = await fetch(url, {
    headers: {
      "user-agent": AGENTE_IMAGEN,
      accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      ...(refererDe(url) ? { referer: refererDe(url) } : {}),
    },
    // `AbortSignal.any` llegó en Node 20.3; en versiones anteriores (o en alguna
    // build rara de Termux) se sigue solo con el plazo.
    signal: senal && typeof AbortSignal.any === "function" ? AbortSignal.any([reloj, senal]) : reloj,
  });

  if (!res.ok) throw new Error(`la imagen respondió ${res.status}`);

  const tipo = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (tipo && !tipo.startsWith("image/")) throw new Error(`eso no era una imagen (${tipo})`);

  const largo = Number(res.headers.get("content-length") || 0);
  if (largo > PESO_MAXIMO) throw new Error("la imagen pesa demasiado");

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error("la imagen vino vacía");
  if (buffer.length > PESO_MAXIMO) throw new Error("la imagen pesa demasiado");

  return { buffer, tipo: tipo || "image/jpeg", url };
}

/** `sharp` se carga una vez y, si no está, se sigue sin él. */
let sharpPedido = null;

async function comprimir(buffer) {
  try {
    sharpPedido ||= import("sharp").then((m) => m.default).catch(() => null);
    const sharp = await sharpPedido;
    if (!sharp) return null;

    // Una imagen de 3 MB tarda mucho más en subir que una de 200 KB, y en el
    // chat se ve igual: 900 px de lado sobran para una ficha de personaje.
    const salida = await sharp(buffer)
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return salida.length < buffer.length ? salida : null;
  } catch {
    return null; // sin sharp (o con una imagen rara) se manda el original
  }
}

/**
 * Baja varias candidatas a la vez y se queda con la primera que llegue bien.
 *
 * En serie, dos descargas lentas son ocho segundos más ocho. En paralelo, el
 * tiempo es el de la más rápida, y las demás se cancelan en cuanto una termina.
 */
async function bajarPrimera(candidatas, limite) {
  if (!candidatas.length) return null;

  const control = new AbortController();
  const tareas = candidatas.slice(0, 3).map((c) => {
    const t0 = Date.now();
    return descargarImagen(c.url, limite, control.signal).then(
      (bajada) => {
        traza(`  candidata ok ${(bajada.buffer.length / 1024).toFixed(0)}KB en ${Date.now() - t0}ms (${c.muestra ? "muestra" : "original"} ${c.ancho}px)`);
        control.abort(); // las otras ya no hacen falta
        return bajada;
      },
      (err) => {
        // AbortError aquí es normal: es una candidata que se canceló porque otra
        // llegó antes. Solo se anota lo que falla de verdad.
        if (err?.name !== "AbortError") traza(`  candidata falló en ${Date.now() - t0}ms: ${err.name}`);
        throw err;
      }
    );
  });

  try {
    return await Promise.any(tareas);
  } catch {
    return null;
  }
}

/**
 * Saca una imagen de verdad para un personaje.
 *
 * Prueba con el tag y, si ese no trae nada, con su nombre. Dos intentos de
 * descarga como mucho, y siempre mirando el reloj: si el presupuesto se acabó,
 * se devuelve `null` y el comando lo dice, en vez de dejar a alguien esperando.
 */
export async function imagenDe(personaje, limite = Date.now() + PRESUPUESTO) {
  const candidatos = [personaje?.tags?.[0], personaje?.name].filter(Boolean);

  for (const tag of candidatos) {
    if (queda(limite) < 1000) break;
    const candidatas = await buscarImagenes(tag, limite);
    if (!candidatas.length) continue;

    // Se barajan un poco las tres que llegan antes, para que no salga siempre
    // la misma foto del personaje.
    const finales = candidatas.slice(0, 3).sort(() => Math.random() - 0.5);
    const t0 = Date.now();
    const bajada = await bajarPrimera(finales, limite);
    traza(
      `descargar ${tag}: ${bajada ? `${(bajada.buffer.length / 1024).toFixed(0)}KB` : "sin suerte"} en ${Date.now() - t0}ms`
    );
    if (!bajada) continue;

    const comprimida = await comprimir(bajada.buffer);
    return comprimida ? { buffer: comprimida, tipo: "image/jpeg", url: bajada.url } : bajada;
  }
  return null;
}

/**
 * Elige un personaje al azar y le consigue imagen.
 *
 * Si el primero no tiene fotos (pasa con tags raros), se prueba el siguiente,
 * pero dentro del mismo presupuesto. Devuelve `{ personaje, imagen }` o `null`.
 */
export async function tirarPersonaje(personajes = [], { intentos = 3, plazo = PRESUPUESTO } = {}) {
  if (!personajes.length) return null;

  const limite = Date.now() + plazo;
  const yaProbados = new Set();

  for (let i = 0; i < intentos; i++) {
    if (queda(limite) < 1500) break;

    const disponibles = personajes.filter((p) => !yaProbados.has(p.id));
    if (!disponibles.length) break;

    const personaje = disponibles[Math.floor(Math.random() * disponibles.length)];
    yaProbados.add(personaje.id);

    const imagen = await imagenDe(personaje, limite);
    if (imagen) return { personaje, imagen };
  }
  return null;
}

// ── tiempos y textos ────────────────────────────────────────────────────────

/** «14m 3s», «2h 10m», «8s»: el tiempo que falta, en corto. */
export function restante(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;

  if (horas) return `${horas}h ${minutos}m`;
  if (minutos) return `${minutos}m ${segundos}s`;
  return `${segundos}s`;
}

/** «13/11/2026» */
export function fechaCorta(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Número con separador de miles. */
export function miles(n) {
  return Number(n || 0).toLocaleString("es-MX");
}

/**
 * El pedazo de chat de gacha, ya creado.
 *
 * `gacha` va en `false` cuando un administrador lo apaga; si nadie lo tocó, se
 * juega (así los grupos que ya lo usaban no se enteran de nada).
 */
export function chatDeGacha(db, from) {
  if (!db.chats[from]) db.chats[from] = {};
  const chat = db.chats[from];
  chat.users ||= {};
  chat.characters ||= {};
  chat.rolls ||= {};
  return chat;
}

/** ¿Está apagado el gacha en este chat? */
export function gachaApagado(chat) {
  return chat?.gacha === false;
}

/** Borra los tiros que ya caducaron, para que no crezca sin freno. */
export function limpiarRolls(chat, ahora = Date.now()) {
  let borrados = 0;
  for (const [msgId, roll] of Object.entries(chat?.rolls || {})) {
    if (roll?.expiresAt && ahora > roll.expiresAt) {
      delete chat.rolls[msgId];
      borrados++;
    }
  }
  return borrados;
}
