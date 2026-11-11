/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { formatoPeligroso, asegurarEntrada } from "../lib/sticker-seguro.js";

const buffer = (...bytes) => Buffer.from(bytes);
const conCabecera = (cabecera, relleno = 32) =>
  Buffer.concat([Buffer.from(cabecera), Buffer.alloc(relleno)]);

function rechaza(entrada, esperado) {
  try {
    asegurarEntrada(entrada);
  } catch (err) {
    esVerdad(err.message.includes(esperado) || esperado === "", `motivo: ${err.message}`);
    return err.message;
  }
  throw new Error("no rechazó la entrada peligrosa");
}

export const pruebas = [
  ["detecta ASF/WMA por su cabecera de 8 bytes", () => {
    const asf = buffer(0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0, 0, 0, 0);
    igual(formatoPeligroso(asf), "ASF/WMA", "asf");
  }],

  ["detecta ICNS (iconos de macOS)", () => {
    igual(formatoPeligroso(conCabecera("icns")), "ICNS", "icns");
  }],

  ["detecta HEIF y AVIF por la marca del contenedor", () => {
    for (const marca of ["heic", "heix", "mif1", "msf1", "avif"]) {
      const buf = Buffer.concat([buffer(0, 0, 0, 0x18), Buffer.from("ftyp"), Buffer.from(marca), Buffer.alloc(16)]);
      igual(formatoPeligroso(buf), "HEIF/AVIF", marca);
    }
  }],

  ["detecta JPEG XL en contenedor y en flujo directo", () => {
    const enContenedor = Buffer.concat([buffer(0, 0, 0, 0x0c), Buffer.from("ftyp"), Buffer.from("jxl "), Buffer.alloc(8)]);
    igual(formatoPeligroso(enContenedor), "JPEG XL", "contenedor");
    igual(formatoPeligroso(buffer(0xff, 0x0a, 0, 0)), "JPEG XL", "flujo");
  }],

  ["deja pasar PNG, JPEG, WebP, GIF y MP4", () => {
    const png = buffer(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
    const jpeg = buffer(0xff, 0xd8, 0xff, 0xe0, 0, 0);
    const webp = Buffer.concat([Buffer.from("RIFF"), buffer(0, 0, 0, 0), Buffer.from("WEBP")]);
    const gif = Buffer.from("GIF89a....");
    const mp4 = Buffer.concat([buffer(0, 0, 0, 0x18), Buffer.from("ftyp"), Buffer.from("isom"), Buffer.alloc(8)]);
    for (const [nombre, buf] of Object.entries({ png, jpeg, webp, gif, mp4 })) {
      igual(formatoPeligroso(buf), null, nombre);
    }
  }],

  ["asegurarEntrada devuelve el buffer cuando es inocuo", () => {
    const png = buffer(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    igual(asegurarEntrada(png), png, "mismo buffer");
  }],

  ["asegurarEntrada explica en castellano por qué corta", () => {
    const motivo = rechaza(conCabecera("icns"), "ICNS");
    esVerdad(/JPG, PNG o WEBP/.test(motivo), "tiene que decir qué mandar en su lugar");
  }],

  ["un archivo vacío no revienta: se dice que vino vacío", () => {
    rechaza(Buffer.alloc(0), "vacío");
  }],
];
