/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/inventario-subbots.test.mjs — cuántos sub-bots hay, de verdad.
 *
 * Sergio preguntó «no sé cuántos sub-bots tengo» y el bot contestaba que uno.
 * No era un problema de conteo: `.bots` buscaba los sockets en un sitio donde
 * nunca hubo nada (`global.conns`), así que la lista salía siempre con el bot
 * principal aunque hubiera diez cuentas conectadas.
 *
 * Aquí se fija la regla que ahora usa todo el mundo (`.bots`, `.serbot` y el
 * informe de `.revivirsubs`): qué cuenta como sub-bot, y qué estado tiene.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { inventarioSubbots, puedeGestionar, lineaDeFila, ESTADOS } from "../lib/inventario-subbots.js";

export const pruebas = [
  ["cuenta los que están conectados, no solo el principal", () => {
    const inv = inventarioSubbots({
      resumen: { numeros: ["5211111111111", "5222222222222"], maximo: 10 },
      vinculadas: ["5211111111111", "5222222222222", "5233333333333"],
    });
    igual(inv.total, 3, "tres cuentas en total");
    igual(inv.activos, 2, "dos conectadas");
    igual(inv.apagados, 1, "una vinculada pero apagada");
    igual(inv.vinculadas, 3, "las tres tienen sesión");
    igual(inv.maximo, 10, "el techo del gestor");
  }],

  ["cada número aparece una sola vez, aunque llegue por dos lados", () => {
    const inv = inventarioSubbots({
      resumen: { numeros: ["5211111111111"], conectando: ["5211111111111"], reintentando: [{ numero: "5211111111111", intentos: 2 }] },
      vinculadas: ["5211111111111", "5211111111111"],
    });
    igual(inv.total, 1, "sin duplicados");
    igual(inv.filas[0].estado, "conectado", "manda el estado más vivo");
  }],

  ["los estados van del más vivo al más muerto", () => {
    const inv = inventarioSubbots({
      resumen: {
        numeros: ["5213333333333"],
        conectando: ["5212222222222"],
        reintentando: [{ numero: "5211111111111", intentos: 3 }],
      },
      vinculadas: ["5214444444444"],
    });
    igual(inv.filas.map((f) => f.estado), ["conectado", "conectando", "reintentando", "apagado"], "orden");
    igual(inv.filas.map((f) => f.numero), ["5213333333333", "5212222222222", "5211111111111", "5214444444444"], "y por número dentro de cada estado");
    esVerdad(ESTADOS.length === 4, "cuatro estados y ninguno más");
  }],

  ["un socket que aún no abrió se llama «conectando», no «apagado»", () => {
    const inv = inventarioSubbots({ resumen: { numeros: [], conectando: ["5215555555555"] }, vinculadas: [] });
    igual(inv.filas[0].estado, "conectando", "estado");
    igual(inv.activos, 0, "no cuenta como activo");
    igual(inv.conectando, 1, "pero sí está en marcha");
  }],

  ["un reintento lleva su número de intentos a la vista", () => {
    const inv = inventarioSubbots({ resumen: { reintentando: [{ numero: "5216666666666", intentos: 4 }] } });
    igual(inv.filas[0].intentos, 4, "intentos");
    const linea = lineaDeFila(inv.filas[0]);
    esVerdad(linea.includes("4 intentos"), "la línea lo dice");
    esVerdad(linea.includes("5216666666666"), "y nombra el número");
  }],

  ["sin nada, el inventario está vacío y no miente", () => {
    for (const entrada of [{}, { resumen: {} }, { resumen: null, vinculadas: null }]) {
      const inv = inventarioSubbots(entrada);
      igual(inv.total, 0, "cero");
      igual(inv.filas, [], "sin filas");
      igual(inv.maximo, null, "sin techo inventado");
    }
  }],

  ["la basura no se cuela como número", () => {
    const inv = inventarioSubbots({
      resumen: { numeros: ["", null, undefined, "abc", "5217777777777"] },
      vinculadas: ["  ", "5218888888888@s.whatsapp.net"],
    });
    igual(inv.filas.map((f) => f.numero), ["5217777777777", "5218888888888"], "solo dígitos con sentido");
    igual(inv.total, 2, "dos");
  }],

  ["quién puede tocar un sub-bot: el suyo, o el dueño del bot", () => {
    esVerdad(puedeGestionar({ quien: "5211111111111", numeroObjetivo: "5211111111111" }), "lo suyo");
    esVerdad(puedeGestionar({ quien: "5299999999999", numeroObjetivo: "5211111111111", esOwner: true }), "el dueño puede con todos");
    igual(puedeGestionar({ quien: "5211111111111", numeroObjetivo: "5222222222222" }), false, "lo ajeno, no");
    igual(puedeGestionar({ quien: "5211111111111", numeroObjetivo: "" }), false, "sin objetivo, no");
    esVerdad(puedeGestionar({ quien: "5211111111111@s.whatsapp.net", numeroObjetivo: "5211111111111" }), "el jid y el número son lo mismo");
  }],
];
