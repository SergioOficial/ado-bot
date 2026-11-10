/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/red-segura.js — pedir una URL sin abrirle la puerta de casa al que la pide.
 *
 * Un comando que hace `fetch(url)` con lo que llega por WhatsApp es un SSRF con
 * ruedas: `http://127.0.0.1:8080`, `http://192.168.1.1`, `http://169.254.169.254`
 * (metadatos de la nube, que en AWS regalan credenciales) o un dominio público
 * que RESUELVE a una IP privada. Y el truco de siempre: un `302` desde un
 * dominio legítimo hacia `127.0.0.1`.
 *
 * Cuatro capas:
 *   1. Solo http y https.
 *   2. Se rechazan las IP privadas, loopback, enlace local, CGNAT y multicast.
 *   3. Se resuelve el DNS y se comprueba cada IP de destino.
 *   4. No se siguen redirecciones.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_DESCARGA = 5 * 1024 * 1024; // 5 MB
export const PLAZO_MS = 20_000;

function ipv4Numeros(ip) {
  return ip.split(".").map((n) => Number(n));
}

/** ¿Es una IPv4 que no debe alcanzarse desde el bot? */
export function ipv4Privada(ip) {
  const [a, b] = ipv4Numeros(ip);
  if (Number.isNaN(a) || Number.isNaN(b)) return true;

  if (a === 0 || a === 10 || a === 127) return true; // esto, privadas, loopback
  if (a === 169 && b === 254) return true; // enlace local (metadatos de nube)
  if (a === 172 && b >= 16 && b <= 31) return true; // privadas
  if (a === 192 && b === 168) return true; // privadas
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 y 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // pruebas
  if (a >= 224) return true; // multicast y reservadas (incluye 255.255.255.255)
  return false;
}

/** ¿Es una IPv6 que no debe alcanzarse? */
export function ipv6Privada(ip) {
  const limpia = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (limpia === "::1" || limpia === "::") return true;
  if (limpia.startsWith("fe80") || limpia.startsWith("fc") || limpia.startsWith("fd")) return true; // enlace local / únicas locales
  if (limpia.startsWith("::ffff:")) return ipv4Privada(limpia.slice(7)); // IPv4 mapeada
  if (limpia.startsWith("ff")) return true; // multicast
  return false;
}

export function ipPrivada(ip) {
  const familia = isIP(ip);
  if (familia === 4) return ipv4Privada(ip);
  if (familia === 6) return ipv6Privada(ip);
  return true; // lo que no se entiende, no se usa
}

/**
 * Valida la URL. Lanza con un motivo en castellano si no se puede usar.
 * @param {string} cruda
 * @param {(host:string)=>Promise<string[]>} [resolver] para las pruebas
 * @returns {Promise<URL>}
 */
export async function validarURL(cruda, resolver = resolverDNS) {
  let u;
  try {
    u = new URL(String(cruda).trim());
  } catch {
    throw new Error("Ese enlace no se entiende.");
  }

  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("Solo se pueden pedir enlaces http o https.");
  }
  if (u.username || u.password) {
    throw new Error("Ese enlace lleva usuario y contraseña dentro: no lo voy a abrir.");
  }

  // IP escrita directamente.
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && ipPrivada(host)) {
    throw new Error("Esa dirección es de la red interna del servidor.");
  }

  // Y si es un nombre, se resuelve: puede apuntar a 192.168.x.x igual.
  if (!isIP(host)) {
    const ips = await resolver(host);
    if (!ips.length) throw new Error("Ese dominio no resuelve a ninguna dirección.");
    for (const ip of ips) {
      if (ipPrivada(ip)) {
        throw new Error("Ese dominio apunta a una dirección interna del servidor.");
      }
    }
  }

  return u;
}

/** Resuelve todas las direcciones de un nombre. */
export async function resolverDNS(host) {
  try {
    const lista = await lookup(host, { all: true });
    return lista.map((l) => l.address);
  } catch {
    return [];
  }
}

/**
 * Pide la URL con las protecciones puestas.
 * Devuelve `{ buffer, tipo, estado, url }`.
 */
export async function pedirSeguro(cruda, { max = MAX_DESCARGA, plazo = PLAZO_MS, resolver } = {}) {
  const u = await validarURL(cruda, resolver);

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), plazo);
  try {
    const respuesta = await fetch(u, {
      redirect: "manual", // una redirección es justo el truco para saltarse el filtro
      signal: control.signal,
      headers: { "user-agent": "Levi-Bot (+https://github.com/SergioOficial/Levi-bot)" },
    });

    if (respuesta.status >= 300 && respuesta.status < 400) {
      const destino = respuesta.headers.get("location") || "(sin destino)";
      throw new Error(`Ese enlace redirige a ${destino}. Pídemelo directamente si confías en él.`);
    }

    const tipo = respuesta.headers.get("content-type") || "";
    const largo = Number(respuesta.headers.get("content-length") || 0);
    if (largo > max) throw new Error(`Ese archivo pesa ${(largo / 1048576).toFixed(1)} MB y el máximo son ${max / 1048576} MB.`);

    // Se corta la lectura aunque el servidor mienta con el content-length.
    const trozos = [];
    let total = 0;
    for await (const trozo of respuesta.body) {
      total += trozo.length;
      if (total > max) {
        throw new Error(`Ese archivo pasa de ${max / 1048576} MB: no lo voy a bajar entero.`);
      }
      trozos.push(trozo);
    }

    return { buffer: Buffer.concat(trozos), tipo, estado: respuesta.status, url: u.toString() };
  } finally {
    clearTimeout(reloj);
  }
}
