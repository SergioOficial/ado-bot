/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/metadatos.js — que dos mensajes no salgan con los mismos datos de relleno.
 *
 * QUÉ ES CIERTO Y QUÉ NO
 * ----------------------
 * Conviene separar dos cosas, porque de mezclarlas salen promesas falsas:
 *
 *   1. El contenido cifrado NUNCA se repite. Cada mensaje que sale va cifrado con
 *      su propia clave de sesión y su propio relleno aleatorio; dos «hola»
 *      seguidos son dos cifrados distintos. Ahí no hay nada que arreglar: ya es
 *      distinto sin hacer nada.
 *
 *   2. Lo que SÍ se puede repetir es la parte que WhatsApp no enseña pero lee:
 *      los datos de contexto que acompañan al mensaje. Un `messageSecret`
 *      reutilizado, un `templateId` fijo o un `deviceListMetadata` siempre vacío
 *      hacen que cien mensajes distintos lleven el mismo relleno, y eso es un
 *      patrón. Esto es lo que se arregla aquí: cada mensaje que lo necesite sale
 *      con su propio relleno, al azar, sin tocar ni una letra de lo que se ve.
 *
 * LO QUE ESTO NO HACE: no vuelve invisible al bot. Lo que de verdad levanta
 * alarmas son las conductas: mandar el mismo texto a gente que no te ha escrito,
 * contestar en milisegundos siempre, hablar las veinticuatro horas. Eso lo
 * trabajan `lib/antiban.js` (cola, tope, ritmo) y `lib/ritmo.js` (horario,
 * tecleo); aquí solo se quita el relleno repetido.
 */
import { randomBytes, createHash } from "crypto";

/** Una marca nueva de 32 bytes, en base64: lo que un teléfono pone en cada mensaje. */
export function secretoDeMensaje() {
  return randomBytes(32).toString("base64");
}

/** Un identificador corto al azar, para campos que solo tienen que ser únicos. */
export function idDeMensaje(largo = 22) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(largo);
  let salida = "";
  for (let i = 0; i < largo; i++) salida += alfabeto[bytes[i] % alfabeto.length];
  return salida;
}

/** ¿El mensaje lleva botones, lista, plantilla o encuesta? */
export function llevaInteractivo(contenido) {
  if (!contenido || typeof contenido !== "object") return false;
  const claves = [
    "interactiveMessage",
    "templateMessage",
    "buttonsMessage",
    "listMessage",
    "pollCreationMessage",
    "pollCreationMessageV2",
    "pollCreationMessageV3",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
  ];
  if (claves.some((c) => contenido[c])) return true;
  // Los interactivos también pueden venir envueltos en un mensaje de dispositivo.
  if (contenido.deviceSentMessage?.message) return llevaInteractivo(contenido.deviceSentMessage.message);
  if (contenido.ephemeralMessage?.message) return llevaInteractivo(contenido.ephemeralMessage.message);
  return false;
}

/**
 * Pone relleno único en los campos que no se ven.
 *
 * No pisa nada que ya venga puesto: si el plugin (o WhatsApp) ya eligió un
 * secreto, se respeta. Solo rellena lo que falta o lo que está fijo.
 *
 * Devuelve el mismo objeto que recibe, ya tocado, para poder encadenarlo en el
 * envío sin copiar mensajes enteros.
 */
export function sellar(contenido) {
  if (!contenido || typeof contenido !== "object") return contenido;
  if (!llevaInteractivo(contenido)) return contenido;

  contenido.messageContextInfo ||= {};
  if (!contenido.messageContextInfo.messageSecret) {
    contenido.messageContextInfo.messageSecret = secretoDeMensaje();
  }

  const plantilla = contenido.templateMessage;
  if (plantilla) {
    // Un `templateId` fijo convierte cien mensajes distintos en el mismo mensaje.
    if (!plantilla.templateId) plantilla.templateId = idDeMensaje();
  }

  return contenido;
}

/** Lo que se ve de un mensaje, para comparar dos envíos sin mirar el cifrado. */
export function huellaDe(contenido) {
  const visible = [];
  const visitar = (nodo, fondo = 0) => {
    if (fondo > 6 || !nodo || typeof nodo !== "object") return;
    if (typeof nodo.text === "string") visible.push(nodo.text);
    if (typeof nodo.caption === "string") visible.push(nodo.caption);
    if (typeof nodo.title === "string") visible.push(nodo.title);
    if (typeof nodo.fileName === "string") visible.push(nodo.fileName);
    for (const [clave, valor] of Object.entries(nodo)) {
      if (clave === "mentions" || clave === "contextInfo" || clave === "messageContextInfo") continue;
      if (valor && typeof valor === "object") visitar(valor, fondo + 1);
    }
  };
  visitar(contenido);
  return createHash("sha256").update(visible.join("\u0000")).digest("hex").slice(0, 16);
}

export default { secretoDeMensaje, idDeMensaje, llevaInteractivo, sellar, huellaDe };
