/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/ayuda.mjs — utilidades mínimas para las pruebas (sin dependencias).
 *
 * Cada archivo de pruebas exporta `pruebas` (lista de {nombre, fn}) donde fn
 * lanza si algo falla. scripts/probar.mjs las ejecuta todas.
 */
export function igual(obtenido, esperado, que = "") {
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${que}: se esperaba ${b} y salió ${a}`);
}
export function esVerdad(condicion, que = "") {
  if (!condicion) throw new Error(`${que}: se esperaba verdadero`);
}
export function lanza(fn, que = "") {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${que}: se esperaba un error y no lo hubo`);
}
