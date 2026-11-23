/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/inventario-subbots.js — cuántos sub-bots hay, y en qué estado está cada uno.
 *
 * De aquí salen `.bots`, `.serbot` y el informe de `.revivirsubs`. Antes cada
 * uno lo contaba a su manera: `.bots` buscaba `global.conns` (que nadie llena),
 * así que siempre veía uno —el principal— aunque hubiera diez conectados; y
 * `.serbot` leía una carpeta `./subs` que no es donde viven las sesiones.
 *
 * La regla es sencilla: un sub-bot existe si hay algo que lo mencione, y su
 * estado es el primero que aplique de esta lista, del más vivo al más muerto:
 *
 *   conectado      el socket está abierto y atendiendo
 *   conectando     hay socket, pero todavía no abrió
 *   reintentando   se cayó y tiene un reintento agendado
 *   apagado        está vinculado en disco, pero no arrancado
 *
 * `vinculado` es otra cosa: significa que hay sesión guardada (creds.json), o
 * sea que se puede arrancar sin volver a pedir código.
 */

export const ESTADOS = ["conectado", "conectando", "reintentando", "apagado"];

/** Lo que hay detrás de cada estado, para no repetirlo en tres plugins. */
export const ETIQUETAS = {
  conectado: { emoji: "🟢", texto: "conectado" },
  conectando: { emoji: "🟡", texto: "conectando" },
  reintentando: { emoji: "🟠", texto: "reintentando" },
  apagado: { emoji: "⚪", texto: "apagado" },
};

const soloDigitos = (n) => String(n ?? "").replace(/\D/g, "");

/**
 * Arma la lista.
 *
 * @param {object}   datos
 * @param {object}   [datos.resumen]      lo que devuelve el gestor (`resumen()`)
 * @param {string[]} [datos.vinculadas]   números con sesión en disco
 * @param {function} [datos.nombreDe]     numero → nombre para mostrar
 * @returns {{filas: Array, total: number, vinculadas: number, activos: number,
 *           conectando: number, reintentando: number, apagados: number, maximo: number|null}}
 */
export function inventarioSubbots({ resumen, vinculadas, nombreDe } = {}) {
  // Puede llegar `null` si el núcleo todavía no existe o el gestor se cayó:
  // en ese caso no hay sub-bots que enseñar, pero tampoco se puede reventar.
  resumen = resumen || {};
  vinculadas = Array.isArray(vinculadas) ? vinculadas : [];
  nombreDe = typeof nombreDe === "function" ? nombreDe : () => "";
  const conectados = new Set((resumen.numeros || []).map(soloDigitos).filter(Boolean));
  const arrancando = new Set((resumen.conectando || []).map(soloDigitos).filter(Boolean));
  const reintentos = new Map(
    (resumen.reintentando || [])
      .map((r) => [soloDigitos(r?.numero), Number(r?.intentos) || 0])
      .filter(([n]) => Boolean(n))
  );
  const enDisco = new Set((vinculadas || []).map(soloDigitos).filter(Boolean));

  const numeros = new Set([...conectados, ...arrancando, ...reintentos.keys(), ...enDisco]);

  const filas = [...numeros].map((numero) => {
    let estado = "apagado";
    if (conectados.has(numero)) estado = "conectado";
    else if (arrancando.has(numero)) estado = "conectando";
    else if (reintentos.has(numero)) estado = "reintentando";
    return {
      numero,
      estado,
      intentos: reintentos.get(numero) || 0,
      vinculado: enDisco.has(numero),
      nombre: String(nombreDe(numero) || "").trim(),
    };
  });

  // Los vivos primero; dentro de cada estado, por número, para que la lista no
  // baile entre una consulta y la siguiente.
  filas.sort((a, b) => {
    const orden = ESTADOS.indexOf(a.estado) - ESTADOS.indexOf(b.estado);
    return orden !== 0 ? orden : a.numero.localeCompare(b.numero);
  });

  return {
    filas,
    total: filas.length,
    vinculadas: filas.filter((f) => f.vinculado).length,
    activos: filas.filter((f) => f.estado === "conectado").length,
    conectando: filas.filter((f) => f.estado === "conectando").length,
    reintentando: filas.filter((f) => f.estado === "reintentando").length,
    apagados: filas.filter((f) => f.estado === "apagado").length,
    maximo: Number.isFinite(resumen.maximo) ? resumen.maximo : null,
  };
}

/** ¿Puede esta persona tocar este sub-bot? Su propia cuenta, o el dueño del bot. */
export function puedeGestionar({ quien, numeroObjetivo, esOwner, duenos = [] } = {}) {
  const objetivo = soloDigitos(numeroObjetivo);
  if (!objetivo) return false;
  if (esOwner) return true;
  if (soloDigitos(quien) === objetivo) return true;
  return (duenos || []).map(soloDigitos).includes(objetivo) && soloDigitos(quien) === objetivo;
}

/** Una línea por sub-bot, en texto llano (WhatsApp). */
export function lineaDeFila({ estado, numero, intentos, nombre }) {
  const etiqueta = ETIQUETAS[estado] || ETIQUETAS.apagado;
  const extra = estado === "reintentando" && intentos ? ` (${intentos} intento${intentos === 1 ? "" : "s"})` : "";
  const como = nombre ? ` *${nombre}* ›` : "";
  return `${etiqueta.emoji} ${etiqueta.texto}${extra}${como} @${numero}`;
}
