/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/sticker-seguro.js — que una imagen rara no cuelgue el bot.
 *
 * wa-sticker-formatter 4.x detecta el tipo con file-type 16, que tiene avisos
 * abiertos de bucle infinito en sus lectores de ASF, ICNS, HEIF y JXL: un
 * archivo con la cabecera bien puesta pero el cuerpo en cero deja el proceso
 * girando. No hay versión de file-type 16 que lo arregle (el arreglo llegó en
 * la 21, que cambia la API y rompe wa-sticker-formatter), así que se corta
 * antes: se miran los primeros bytes y, si es uno de esos formatos, no entra.
 *
 * Ni un solo formato de los que WhatsApp usa para imagen o nota de voz se
 * pierde: PNG, JPEG, WebP, GIF, MP4 y WEBM pasan.
 */

/** Cabeceras de los contenedores que hay que dejar fuera. */
const ASF = [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11];
const MARCAS_HEIF = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1", "avif", "avis"]);

function empiezaPor(buffer, bytes, desde = 0) {
  if (buffer.length < desde + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[desde + i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * ¿Es uno de los formatos que pueden colgar al detector de tipos?
 * @param {Buffer|Uint8Array} entrada
 * @returns {string|null} el nombre del formato, o null si es inocuo
 */
export function formatoPeligroso(entrada) {
  const b = Buffer.isBuffer(entrada) ? entrada : Buffer.from(entrada || []);
  if (b.length < 4) return null;

  if (empiezaPor(b, ASF)) return "ASF/WMA";
  if (b.subarray(0, 4).toString("latin1") === "icns") return "ICNS";
  if (b.length >= 12 && b.subarray(4, 8).toString("latin1") === "ftyp") {
    const marca = b.subarray(8, 12).toString("latin1").toLowerCase();
    if (MARCAS_HEIF.has(marca)) return "HEIF/AVIF";
    if (marca === "jxl ") return "JPEG XL";
  }
  // JPEG XL también viaja como flujo directo.
  if (b[0] === 0xff && b[1] === 0x0a) return "JPEG XL";

  return null;
}

/**
 * Devuelve el buffer si se puede procesar; si no, lanza con el motivo exacto.
 * @param {Buffer|Uint8Array} entrada
 * @returns {Buffer}
 */
export function asegurarEntrada(entrada) {
  const buffer = Buffer.isBuffer(entrada) ? entrada : Buffer.from(entrada || []);
  if (!buffer.length) throw new Error("vino vacío");

  const formato = formatoPeligroso(buffer);
  if (formato) {
    throw new Error(
      `el archivo viene en ${formato} y ese formato se queda colgado al leerlo; mándalo en JPG, PNG o WEBP`
    );
  }
  return buffer;
}

export default { asegurarEntrada, formatoPeligroso };
