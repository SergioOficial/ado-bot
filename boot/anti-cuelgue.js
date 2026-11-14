/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL.
 *
 * boot/anti-cuelgue.js — que un error suelto no tumbe el bot.
 *
 * El bot es un proceso que lleva días encendido y habla con una red que se cae
 * sola. Los cortes (ECONNRESET, EPIPE, «socket hang up») no son fallos del bot:
 * pasan todo el tiempo y no hay nada que arreglar. Se filtran para que el
 * registro no se llene de ruido y el fallo de verdad se vea.
 *
 * Lo que sí importa es esto: el manejador de mensajes es asíncrono y va
 * enganchado a un evento, o sea que nadie lo espera. Un error que escape de ahí
 * sale como rechazo no manejado, y Node apaga el proceso por defecto. Así se caía
 * el servidor entero con un solo mensaje raro. Aquí se apunta y se sigue.
 *
 * La idea y la lista de códigos de red vienen de Shin-MD
 * (https://github.com/riokuroxi-svg/Shin-MD), adaptadas a este núcleo.
 */

const CODIGOS_DE_RED = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "ECONNABORTED",
  "ERR_STREAM_PREMATURE_CLOSE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "WS_ERR_EXPECTED_FIN",
]);

const TEXTOS_DE_RED = [
  "read ECONNRESET",
  "write EPIPE",
  "write EOF",
  "socket hang up",
  "terminated",
  "Stream was destroyed",
];

/** ¿Es un corte de red de los normales, y no un fallo del código? */
export function esErrorDeRed(err) {
  if (!err) return false;
  const codigo = String(err.code || err.cause?.code || "");
  if (CODIGOS_DE_RED.has(codigo)) return true;
  const texto = String(err.message || err);
  return TEXTOS_DE_RED.some((t) => texto.includes(t));
}

/** Un texto corto y legible de cualquier cosa que llegue como error. */
export function resumenError(err) {
  if (!err) return "sin detalle";
  if (typeof err === "string") return err;
  return err.message || err.stack?.split("\n")[0] || String(err);
}

let instalado = false;

/**
 * Registra los manejadores una sola vez (llamarlo dos veces no duplica nada).
 *
 * @param {object} [opciones]
 * @param {function} [opciones.registrar]  dónde apuntar el fallo real
 * @param {function} [opciones.alApagar]   limpieza al recibir SIGINT/SIGTERM
 */
export function instalarAntiCuelgue({ registrar, alApagar } = {}) {
  if (instalado) return false;
  instalado = true;

  process.on("unhandledRejection", (motivo) => {
    if (!motivo || esErrorDeRed(motivo)) return;
    const texto = resumenError(motivo);
    console.error("⚠️ Promesa rechazada sin manejar (el bot sigue):", texto);
    try { registrar?.(motivo); } catch {}
  });

  process.on("uncaughtException", (err) => {
    if (esErrorDeRed(err)) return;
    console.error("⚠️ Excepción sin capturar (el bot sigue):", err?.stack || err);
    try { registrar?.(err); } catch {}
  });

  // Al cortar con Ctrl+C o desde el panel hay que dar tiempo a guardar la base;
  // si no, el último segundo de datos se pierde.
  const apagar = (senal) => {
    console.log(`\n🛑 ${senal} recibido. Guardando y cerrando…`);
    try { global.saveDatabase?.(true); } catch {}
    let cerrado = false;
    const cerrar = async () => {
      if (cerrado) return;
      cerrado = true;
      try { await alApagar?.(); } catch {}
      process.exit(0);
    };
    cerrar();
    // Si la limpieza se queda colgada, que el proceso termine igual.
    setTimeout(() => process.exit(0), 4000).unref?.();
  };

  process.on("SIGINT", () => apagar("SIGINT"));
  process.on("SIGTERM", () => apagar("SIGTERM"));

  return true;
}

export default { instalarAntiCuelgue, esErrorDeRed, resumenError };
