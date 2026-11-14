/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Copyright (C) 2026 riokuroxi-svg
 * Mantener esta cabecera es obligatorio por AGPL.
 *
 * pruebas/bucles.test.mjs — el corte del eco entre cuentas de bot.
 *
 * Lo que se mide aquí es lo que antes no tenía red: que la misma cuenta no
 * repita un comando calcado en menos de un segundo, y que un mensaje que cita
 * una salida propia no vuelva a entrar. Las dos cosas son el eco que aparece
 * cuando varios bots comparten grupo.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { crearGuardaBucles, huellaDe, AJUSTES_GUARDA } from "../lib/bucles.js";

function mensaje({ cita = null, jid = "120363@g.us", id = "IN1" } = {}) {
  return {
    key: { remoteJid: jid, fromMe: false, id },
    message: cita
      ? { extendedTextMessage: { text: ".menu", contextInfo: { stanzaId: cita } } }
      : { conversation: ".menu" },
  };
}

export const pruebas = [
  ["la huella cambia con cada parte del pedido", () => {
    const base = { chat: "A", autor: "1", comando: "menu", args: [] };
    igual(huellaDe(base), "A|1|menu|", "forma");
    esVerdad(huellaDe(base) !== huellaDe({ ...base, chat: "B" }), "otro chat, otra huella");
    esVerdad(huellaDe(base) !== huellaDe({ ...base, autor: "2" }), "otro autor, otra huella");
    esVerdad(huellaDe(base) !== huellaDe({ ...base, comando: "ping" }), "otro comando, otra huella");
    esVerdad(huellaDe(base) !== huellaDe({ ...base, args: ["rpg"] }), "otros argumentos, otra huella");
    igual(huellaDe({ ...base, comando: "MENU" }), huellaDe(base), "el comando va en minúsculas");
    igual(huellaDe({ ...base, args: ["RPG"] }), huellaDe({ ...base, args: ["rpg"] }), "los argumentos también");
  }],

  ["la huella aguanta llamadas incompletas", () => {
    igual(typeof huellaDe(), "string", "sin argumentos");
    igual(typeof huellaDe({ args: "no-es-lista" }), "string", "args que no son lista");
    igual(typeof huellaDe(null), "string", "nulo");
  }],

  ["el mismo pedido calcado dos veces seguidas se corta", () => {
    const g = crearGuardaBucles();
    const pedido = { chat: "A", autor: "1", comando: "menu", args: [] };
    igual(g.permite(pedido, mensaje()).pasa, true, "la primera vez pasa");
    const segunda = g.permite(pedido, mensaje({ id: "IN2" }));
    igual(segunda.pasa, false, "la inmediata se corta");
    esVerdad(String(segunda.motivo).includes("eco"), "el motivo dice eco");
    igual(g.resumen().cortados, 1, "se cuenta");
  }],

  ["pasada la ventana vuelve a atender", () => {
    // Reloj explícito en las tres llamadas: si no, `anotarSalida` y la comparación
    // usarían relojes distintos y la prueba dependería de cuánto tarde en correr.
    const t0 = Date.now();
    const g = crearGuardaBucles({ ventanaMs: 50 });
    const pedido = { chat: "A", autor: "1", comando: "menu", args: [] };
    igual(g.permite(pedido, mensaje(), t0).pasa, true, "primera");
    igual(g.permite(pedido, mensaje({ id: "IN2" }), t0 + 10).pasa, false, "dentro de la ventana");
    igual(g.permite(pedido, mensaje({ id: "IN3" }), t0 + 500).pasa, true, "fuera de la ventana");
  }],

  ["pedidos distintos no se estorban", () => {
    const g = crearGuardaBucles();
    igual(g.permite({ chat: "A", autor: "1", comando: "menu", args: [] }, mensaje()).pasa, true, "uno");
    igual(g.permite({ chat: "A", autor: "1", comando: "ping", args: [] }, mensaje({ id: "IN2" })).pasa, true, "otro comando");
    igual(g.permite({ chat: "B", autor: "1", comando: "menu", args: [] }, mensaje({ id: "IN3", jid: "B@g.us" })).pasa, true, "otro chat");
    igual(g.permite({ chat: "A", autor: "2", comando: "menu", args: [] }, mensaje({ id: "IN4" })).pasa, true, "otro autor");
  }],

  ["un mensaje que cita una salida propia se corta", () => {
    const g = crearGuardaBucles();
    const salida = g.anotarSalida({ key: { id: "SALIDA1", remoteJid: "A@g.us" } }, { jid: "A@g.us" });
    igual(salida, "SALIDA1", "se apunta la clave");
    igual(g.permite({ chat: "A", autor: "1", comando: "menu", args: [] }, mensaje({ cita: "SALIDA1" })).pasa, false, "autorechazo");
  }],

  ["citar un mensaje ajeno no corta nada", () => {
    const t0 = Date.now();
    const g = crearGuardaBucles();
    g.anotarSalida({ key: { id: "SALIDA1", remoteJid: "A@g.us" } });
    igual(g.permite({ chat: "A", autor: "1", comando: "menu", args: [] }, mensaje({ cita: "DE_OTRO" }), t0).pasa, true, "cita ajena");
    // Mismo pedido otra vez, pero fuera de la ventana de eco: lo que se comprueba
    // aquí es la cita, no el eco, así que se adelanta el reloj.
    igual(g.permite({ chat: "A", autor: "1", comando: "menu", args: [] }, mensaje(), t0 + 5_000).pasa, true, "sin cita");
  }],

  ["una salida vieja deja de contar", () => {
    const t0 = Date.now();
    const g = crearGuardaBucles({ memoriaSalidasMs: 1000 });
    g.anotarSalida({ key: { id: "VIEJA", remoteJid: "A@g.us" } }, null, t0);
    igual(g.citaPropia(mensaje({ cita: "VIEJA" }), t0 + 500), true, "dentro de la memoria aún cuenta");
    igual(g.citaPropia(mensaje({ cita: "VIEJA" }), t0 + 5_000), false, "caducó");
  }],

  ["anotarSalida no lanza con salidas raras", () => {
    const g = crearGuardaBucles();
    igual(g.anotarSalida(null), null, "nulo");
    igual(g.anotarSalida({}), null, "sin clave");
    igual(g.anotarSalida({ key: {} }), null, "clave sin id");
    igual(g.anotarSalida({ key: { id: "OK" } }), "OK", "con id sí");
  }],

  ["las huellas tienen tope y no crecen para siempre", () => {
    const g = crearGuardaBucles({ maximoHuellas: 20, ventanaMs: 1 });
    for (let i = 0; i < 500; i++) {
      g.permite({ chat: `C${i}`, autor: "1", comando: "menu", args: [] }, mensaje({ id: `I${i}` }));
    }
    esVerdad(g.resumen().huellas <= 20, `quedan ${g.resumen().huellas} huellas, el tope es 20`);
    igual(g.resumen().vistos, 500, "se contaron todas");
  }],

  ["las salidas tienen tope también", () => {
    const g = crearGuardaBucles({ maximoSalidas: 10 });
    for (let i = 0; i < 300; i++) g.anotarSalida({ key: { id: `S${i}` } });
    esVerdad(g.resumen().salidas <= 10, `quedan ${g.resumen().salidas} salidas, el tope es 10`);
  }],

  ["reiniciar deja la guarda en blanco", () => {
    const g = crearGuardaBucles();
    const pedido = { chat: "A", autor: "1", comando: "menu", args: [] };
    g.permite(pedido, mensaje());
    g.reiniciar();
    igual(g.resumen().cortados, 0, "contador a cero");
    igual(g.permite(pedido, mensaje({ id: "IN9" })).pasa, true, "y vuelve a atender");
  }],

  ["permite no lanza con basura", () => {
    const g = crearGuardaBucles();
    for (const raro of [undefined, null, {}, { chat: null, autor: null, comando: null, args: null }]) {
      const r = g.permite(raro, raro);
      esVerdad(r && typeof r.pasa === "boolean", "respuesta con forma");
    }
  }],

  ["los ajustes por defecto son cortos a propósito", () => {
    esVerdad(AJUSTES_GUARDA.ventanaMs <= 2000, "la ventana de eco es corta");
    esVerdad(AJUSTES_GUARDA.maximoHuellas >= 100, "pero guarda bastantes huellas");
  }],
];
