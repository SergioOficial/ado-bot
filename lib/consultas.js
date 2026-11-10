/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/consultas.js — las pocas APIs externas que se usan, con su plazo.
 *
 * Regla: si una API no responde, el comando lo dice. Nada de devolver datos
 * viejos ni de inventarse un precio. Cada función tiene plazo propio y un
 * mensaje de error distinto por caso, porque «no pude» no sirve para arreglar
 * nada.
 */

const PLAZO = 12_000;

/** Petición JSON o texto con plazo. Lanza con motivo claro. */
export async function pedir(url, { tipo = "json", cabeceras = {} } = {}) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), PLAZO);
  try {
    const respuesta = await fetch(url, {
      signal: control.signal,
      headers: { "user-agent": "Levi-Bot (+https://github.com/SergioOficial/Levi-bot)", ...cabeceras },
    });
    if (!respuesta.ok) throw new Error(`el servicio respondió ${respuesta.status}`);
    return tipo === "json" ? await respuesta.json() : await respuesta.text();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("el servicio tardó demasiado en responder");
    throw err;
  } finally {
    clearTimeout(reloj);
  }
}

/** Nombres que la gente escribe → id de CoinGecko. */
export const MONEDAS = {
  btc: { id: "bitcoin", nombre: "Bitcoin", simbolo: "₿" },
  bitcoin: { id: "bitcoin", nombre: "Bitcoin", simbolo: "₿" },
  eth: { id: "ethereum", nombre: "Ethereum", simbolo: "Ξ" },
  ethereum: { id: "ethereum", nombre: "Ethereum", simbolo: "Ξ" },
  usdt: { id: "tether", nombre: "Tether", simbolo: "₮" },
  tether: { id: "tether", nombre: "Tether", simbolo: "₮" },
  bnb: { id: "binancecoin", nombre: "BNB", simbolo: "BNB" },
  sol: { id: "solana", nombre: "Solana", simbolo: "SOL" },
  solana: { id: "solana", nombre: "Solana", simbolo: "SOL" },
  doge: { id: "dogecoin", nombre: "Dogecoin", simbolo: "Ð" },
  xrp: { id: "ripple", nombre: "XRP", simbolo: "XRP" },
  ada: { id: "cardano", nombre: "Cardano", simbolo: "ADA" },
  ltc: { id: "litecoin", nombre: "Litecoin", simbolo: "Ł" },
  trx: { id: "tron", nombre: "TRON", simbolo: "TRX" },
};

/** Precio de una moneda en dólares y pesos. */
export async function precioCripto(crudo) {
  const clave = String(crudo || "").trim().toLowerCase();
  const moneda = MONEDAS[clave];
  if (!moneda) {
    throw new Error(
      `No conozco *${crudo}*.\n> Sí: ${Object.keys(MONEDAS).filter((k) => k.length > 3).join(", ")}`
    );
  }

  const datos = await pedir(
    `https://api.coingecko.com/api/v3/simple/price?ids=${moneda.id}&vs_currencies=usd,mxn&include_24hr_change=true`
  );
  const fila = datos?.[moneda.id];
  if (!fila || typeof fila.usd !== "number") throw new Error("el servicio no devolvió el precio");

  return {
    nombre: moneda.nombre,
    simbolo: moneda.simbolo,
    usd: fila.usd,
    mxn: fila.mxn ?? null,
    cambio24: typeof fila.usd_24h_change === "number" ? fila.usd_24h_change : null,
  };
}

/** Letra de una canción. */
export async function letraCancion(artista, titulo) {
  const a = String(artista || "").trim();
  const t = String(titulo || "").trim();
  if (!a || !t) throw new Error("Necesito el artista y el título: `.letra Coldplay Yellow`");

  const datos = await pedir(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`
  );
  const letra = String(datos?.lyrics || "").trim();
  if (!letra) throw new Error("ese servicio no tiene la letra de esa canción");

  return { artista: a, titulo: t, letra };
}

/**
 * Acorta un enlace con is.gd.
 * Se usa este servicio porque no pide clave, no mete publicidad en el destino
 * y devuelve el enlace en texto plano (un solo paso, sin páginas intermedias).
 */
export async function acortar(enlace) {
  const url = new URL(String(enlace).trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Solo acorto enlaces http o https.");

  const texto = await pedir(
    `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url.toString())}`,
    { tipo: "texto" }
  );
  const corto = String(texto).trim();
  if (!/^https?:\/\//.test(corto)) throw new Error(corto || "el servicio no devolvió un enlace");
  return corto;
}

/** Sube un archivo y devuelve el enlace público. */
export async function subirArchivo(buffer, nombre) {
  if (!buffer?.length) throw new Error("el archivo llegó vacío");
  if (buffer.length > 20 * 1048576) throw new Error("paso de 20 MB: ese archivo no lo voy a subir");

  const datos = new FormData();
  datos.append("files[]", new Blob([buffer]), nombre || "archivo.bin");

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), 45_000);
  try {
    const respuesta = await fetch("https://uguu.se/upload?output=text", {
      method: "POST",
      body: datos,
      signal: control.signal,
      headers: { "user-agent": "Levi-Bot (+https://github.com/SergioOficial/Levi-bot)" },
    });
    if (!respuesta.ok) throw new Error(`el servicio respondió ${respuesta.status}`);
    const enlace = (await respuesta.text()).trim().split("\n")[0];
    if (!/^https?:\/\//.test(enlace)) throw new Error(enlace || "el servicio no devolvió un enlace");
    return enlace;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("la subida tardó demasiado");
    throw err;
  } finally {
    clearTimeout(reloj);
  }
}
