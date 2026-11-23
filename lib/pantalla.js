/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/pantalla.js — lo que se ve en la terminal mientras se vincula la cuenta.
 *
 * Regla de la casa: el código de vinculación es lo único que importa en esos
 * primeros segundos, así que no se limpia la pantalla, no se redibuja nada y no
 * se pinta el cartel grande del bot hasta que la cuenta esté vinculada de
 * verdad. Perder el código detrás de un `console.clear()` obliga a empezar otra
 * vez, y en un teléfono eso es reiniciar todo.
 *
 * Aquí solo hay texto: estas funciones no imprimen ni leen nada, devuelven las
 * líneas y quien llama decide. Así se pueden probar sin abrir WhatsApp.
 */

/** ¿Ya hay una sesión vinculada? Baileys deja `registered` en true al terminar. */
export function sesionVinculada(creds) {
  return Boolean(creds && creds.registered);
}

/**
 * ¿Toca pintar el cartel grande? Solo con sesión hecha. Sin sesión, la pantalla
 * se queda con el texto llano de la vinculación.
 */
export function tocaPanel(creds) {
  return sesionVinculada(creds);
}

/** El encabezado mínimo mientras falta la vinculación. Sin adornos ni colores. */
export function bloqueSinSesion({ nombre = "Ado-Bot", version = "" } = {}) {
  return [
    "",
    `  ${nombre}${version ? ` v${version}` : ""} — todavía no hay sesión vinculada.`,
    "",
    "  Se vincula una vez y queda guardado en la carpeta de sesión.",
    "",
  ];
}

/**
 * El código, en texto plano y con sitio alrededor para que no se pierda entre
 * los demás mensajes. Nada de `console.clear()`: esto se queda en pantalla
 * hasta que WhatsApp confirma.
 */
export function bloqueCodigo({ numero, codigo, paquete = "" } = {}) {
  const lineas = [
    "",
    "  ────────────────────────────────────────────────",
    `  📱 Número:  ${numero || "(sin número)"}`,
    `  🔐 Código:  ${codigo || "(no llegó)"}`,
    "  ────────────────────────────────────────────────",
    "",
    "  En el teléfono: WhatsApp → Dispositivos vinculados →",
    "  Vincular con número → escribe el código de arriba.",
    "",
  ];
  if (paquete) lineas.push(`  Cliente: ${paquete}`);
  lineas.push("", "  El código se queda aquí. No cierres esta terminal.", "");
  return lineas;
}

/** Lo que se dice mientras se espera el «ya está». */
export function bloqueEsperando(numero) {
  return [
    `  ⏳ Esperando a que vincules${numero ? ` el ${numero}` : ""}…`,
    "     Cuando WhatsApp lo confirme, el bot arranca solo.",
    "",
  ];
}

/** Cuando la vinculación terminó, antes del cartel grande. */
export function bloqueVinculado({ nombre = "Ado-Bot" } = {}) {
  return ["", `  ✅ ${nombre} vinculado. A partir de aquí ya hay panel.`, ""];
}

/**
 * El código caduca a los pocos minutos. Mejor decirlo antes de que alguien se
 * quede mirando una pantalla que ya no va a funcionar.
 */
export function bloqueCaducado() {
  return [
    "",
    "  ⏳ El código caducó sin confirmarse.",
    "     Reinicia el bot (npm start) para pedir uno nuevo.",
    "",
  ];
}
