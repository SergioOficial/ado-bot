/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/subbots-reintento.test.mjs — el techo de reconexión de los sub-bots.
 *
 * Con el código 515 (`restartRequired`) el manejador de cierre se llamaba a sí
 * mismo sin espera y sin límite. Si WhatsApp insistía con el 515, el bot se
 * ponía a crear sockets uno tras otro: memoria arriba y una cuenta haciendo
 * cosas raras a toda velocidad, que es justo lo que mira el anti-ban.
 *
 * Aquí se simula la racha completa de caídas, con el reloj explícito, y se
 * comprueba que la espera crece y que llega un punto en que se rinde.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { esperaDeReintento, decideReintento, REINTENTOS, LIMITE_SUBBOTS } from "../boot/subbots.js";

/** Recorre una racha de caídas y devuelve qué decidió cada una. */
function simularRacha(caidas, cfg = REINTENTOS) {
  const pasos = [];
  let intentos = 0;
  let ultima = 0;
  let reloj = 1_000_000;

  for (let i = 0; i < caidas; i++) {
    const decision = decideReintento(intentos, ultima, reloj, cfg);
    pasos.push({ caida: i + 1, ...decision });
    if (!decision.reintentar) break;
    // Lo que hace el gestor tras decidir: cuenta el intento y marca el reloj.
    intentos += 1;
    ultima = reloj;
    reloj += decision.esperaMs;
  }
  return pasos;
}

export const pruebas = [
  ["la espera crece y tiene techo", () => {
    igual(esperaDeReintento(1), REINTENTOS.baseMs, "primer intento");
    igual(esperaDeReintento(2), REINTENTOS.baseMs * 2, "segundo");
    igual(esperaDeReintento(3), REINTENTOS.baseMs * 4, "tercero");
    igual(esperaDeReintento(50), REINTENTOS.topeMs, "no crece para siempre");
    igual(esperaDeReintento(0), REINTENTOS.baseMs, "un intento 0 cuenta como 1");
    igual(esperaDeReintento(-3), REINTENTOS.baseMs, "ni uno negativo");
    igual(esperaDeReintento("x"), REINTENTOS.baseMs, "ni basura");
  }],

  ["una racha de 515 se rinde en vez de girar", () => {
    const pasos = simularRacha(50);
    igual(pasos.length, REINTENTOS.maximo + 1, `se rinde tras ${REINTENTOS.maximo} reintentos`);

    const reintentos = pasos.slice(0, -1);
    esVerdad(reintentos.every((p) => p.reintentar), "todos los anteriores reintentan");
    igual(pasos[pasos.length - 1].reintentar, false, "el último ya no");

    // La espera tiene que ir subiendo: si no, sigue siendo un bucle apretado.
    for (let i = 1; i < reintentos.length; i++) {
      esVerdad(
        reintentos[i].esperaMs >= reintentos[i - 1].esperaMs,
        `la espera ${i} no baja respecto de la anterior`
      );
    }
    esVerdad(reintentos[reintentos.length - 1].esperaMs > reintentos[0].esperaMs, "y de verdad crece");
  }],

  ["el tiempo total de una racha es asumible", () => {
    const pasos = simularRacha(50);
    const total = pasos.reduce((suma, p) => suma + (p.esperaMs || 0), 0);
    esVerdad(total >= 30_000, `no ametralla: ${total} ms en total`);
    esVerdad(total <= REINTENTOS.maximo * REINTENTOS.topeMs, "y no se queda colgado horas");
  }],

  ["tras un rato estable el contador vuelve a cero", () => {
    const t = 1_000_000;
    // Lleva 4 intentos y se cayó hace más de `estableMs`: cuenta como primera.
    const r = decideReintento(4, t - REINTENTOS.estableMs - 1, t);
    igual(r.reintentar, true, "reintenta");
    igual(r.motivo, `intento 1/${REINTENTOS.maximo}`, "el contador se reinició");
    igual(r.esperaMs, REINTENTOS.baseMs, "y la espera vuelve a la base");
  }],

  ["una caída reciente sí acumula", () => {
    const t = 1_000_000;
    const r = decideReintento(4, t - 1000, t);
    igual(r.motivo, `intento 5/${REINTENTOS.maximo}`, "sigue la cuenta");
  }],

  ["la primera caída no se confunde con una racha vieja", () => {
    const t = 1_000_000;
    // `ultima` en 0 es lo que pone el gestor antes de agendar nada: significa
    // «primera caída», no «hace mucho que no se cae».
    igual(decideReintento(0, 0, t).motivo, `intento 1/${REINTENTOS.maximo}`, "con 0");
    igual(decideReintento(0, null, t).motivo, `intento 1/${REINTENTOS.maximo}`, "con null");
    igual(decideReintento(3, 0, t).motivo, `intento 4/${REINTENTOS.maximo}`, "y no borra lo llevado");
  }],

  ["al llegar al techo no se agenda nada", () => {
    const t = 1_000_000;
    const r = decideReintento(REINTENTOS.maximo, t - 10, t);
    igual(r.reintentar, false, "no reintenta");
    igual(r.esperaMs, 0, "no hay espera que agendar");
    esVerdad(String(r.motivo).includes(String(REINTENTOS.maximo)), "el motivo dice el techo");
  }],

  ["el techo se puede configurar", () => {
    const cfg = { ...REINTENTOS, maximo: 2, baseMs: 100, topeMs: 1000, estableMs: 500 };
    const pasos = simularRacha(20, cfg);
    igual(pasos.length, 3, "dos reintentos y se rinde");
    igual(pasos[0].esperaMs, 100, "con su propia base");
    igual(pasos[2].reintentar, false, "rinde");
  }],

  ["basura por entrada no lanza", () => {
    for (const raro of [undefined, null, "x", {}, -1]) {
      const r = decideReintento(raro, raro, raro, raro);
      esVerdad(r && typeof r.reintentar === "boolean", `respuesta con forma para ${String(raro)}`);
    }
    igual(typeof decideReintento(), "object", "sin argumentos");
  }],

  ["los topes tienen valores sensatos", () => {
    esVerdad(LIMITE_SUBBOTS >= 1 && LIMITE_SUBBOTS <= 50, "límite de sub-bots razonable");
    esVerdad(REINTENTOS.maximo >= 2, "al menos un par de intentos");
    esVerdad(REINTENTOS.baseMs >= 1000, "la primera espera no es inmediata");
    esVerdad(REINTENTOS.topeMs > REINTENTOS.baseMs, "y el techo es mayor que la base");
    esVerdad(REINTENTOS.estableMs > REINTENTOS.topeMs, "lo «estable» dura más que una espera");
  }],
];
