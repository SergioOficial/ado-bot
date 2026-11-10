/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/economia.js — las cuentas del dinero, en un solo sitio.
 *
 * Todo lo que mueve coins pasa por aquí para que las reglas sean las mismas en
 * todos los comandos: apuestas enteras, nunca más de lo que hay, y el saldo
 * siempre se escribe con el mismo formato.
 *
 * Los campos son los que ya usaba Levi y no se renombran (renombrarlos dejaría
 * a todo el mundo sin saldo): `coins` (efectivo), `bank` (banco), `coffer`
 * (caja fuerte, nuevo), `streak`, `lastDaily`, `lastWeekly`, `lastMonthly`.
 */

export const DIA = 86_400_000;

/** Formato del dinero, igual que el resto del bot. */
export function dinero(n) {
  return `¥${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;
}

/** Caja del usuario, creándola si hace falta. */
export function usuario(db, jid) {
  const u = (db.users ||= {})[jid] ||= {};
  u.coins = Number(u.coins) || 0;
  u.bank = Number(u.bank) || 0;
  u.coffer = Number(u.coffer) || 0;
  return u;
}

/**
 * Lee una apuesta. Devuelve `{ ok, cantidad }` o `{ ok:false, error }`.
 * Acepta `all` (todo el efectivo) pero nunca el banco: si se pudiera apostar
 * el banco, un error de tecleo se lleva los ahorros de alguien.
 */
export function leerApuesta(u, crudo) {
  const texto = String(crudo ?? "").toLowerCase();
  let cantidad = texto === "all" || texto === "todo" ? u.coins : Number(texto);

  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
    return { ok: false, error: "La apuesta tiene que ser un número entero mayor que 0." };
  }
  if (cantidad > u.coins) {
    return { ok: false, error: `No te alcanza: tienes ${dinero(u.coins)} en efectivo.` };
  }
  return { ok: true, cantidad };
}

/** Tiempo que falta, en texto corto. */
export function falta(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}

/**
 * Comprueba el plazo de una recompensa y, si toca, la marca.
 * @returns {{ ok:true, premio:number } | { ok:false, espera:number }}
 */
export function cobrarPlazo(u, campo, plazoMs, calcularPremio) {
  const ahora = Date.now();
  const ultimo = Number(u[campo]) || 0;
  const pasado = ahora - ultimo;
  if (ultimo && pasado < plazoMs) return { ok: false, espera: plazoMs - pasado };
  const premio = Math.round(calcularPremio());
  u[campo] = ahora;
  u.coins += premio;
  return { ok: true, premio };
}

/** Ruleta europea: números, colores y pagos reales. */
export const ROJO = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function colorDe(n) {
  if (n === 0) return "verde";
  return ROJO.has(n) ? "rojo" : "negro";
}

/**
 * Resuelve una tirada de ruleta.
 * @param {number} numero  0–36
 * @param {{tipo:string, valor?:any}} apuesta
 * @param {number} cantidad
 * @returns {{ gana:boolean, devuelve:number, detalle:string }}
 *   `devuelve` es lo que se suma al saldo (0 si pierde; cantidad × 2 si acierta
 *   color/par, cantidad × 36 si acierta número exacto).
 */
export function pagarRuleta(numero, apuesta, cantidad) {
  const color = colorDe(numero);
  switch (apuesta.tipo) {
    case "color": {
      if (color === apuesta.valor) return { gana: true, devuelve: cantidad * 2, detalle: `salió ${numero} ${color}` };
      return { gana: false, devuelve: 0, detalle: `salió ${numero} ${color}` };
    }
    case "paridad": {
      if (numero === 0) return { gana: false, devuelve: 0, detalle: "salió 0 (el cero gana para la casa)" };
      const esPar = numero % 2 === 0;
      const acierta = (apuesta.valor === "par" && esPar) || (apuesta.valor === "impar" && !esPar);
      return { gana: acierta, devuelve: acierta ? cantidad * 2 : 0, detalle: `salió ${numero} ${color}` };
    }
    case "numero": {
      const acierta = numero === Number(apuesta.valor);
      return { gana: acierta, devuelve: acierta ? cantidad * 36 : 0, detalle: `salió ${numero} ${color}` };
    }
    default:
      return { gana: false, devuelve: 0, detalle: "apuesta desconocida" };
  }
}
