/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { equal, match } from "node:assert/strict";
import { prepararAntiban } from "../boot/vigilantes.js";
import { formatearLog } from "../lib/log-formato.js";

export const pruebas = [
  ["un error conserva el mensaje y la traza en los logs", () => {
    const texto = formatearLog(new Error("fallo de prueba"));
    match(texto, /Error: fallo de prueba/);
    match(texto, /estabilidad-riokuroxi/);
  }],
  ["los objetos circulares no rompen el registro", () => {
    const objeto = {}; objeto.yo = objeto;
    match(formatearLog(objeto), /Circular/);
  }],
  ["el silencio no cierra un socket sano con anti-ban activado", () => {
    const ahora = Date.now;
    let tiempo = 1_000_000;
    let cierres = 0;
    const sock = {
      ws: { ready: true, close: () => { cierres++; } },
      sendMessage: async () => {},
      relayMessage: async () => {},
    };
    let antiban;
    try {
      Date.now = () => tiempo;
      antiban = prepararAntiban(sock, { obtenerDb: () => ({}), encendido: true });
      if (!antiban) throw new Error("No se pudo iniciar el anti-ban");
      antiban.vigilante.latido();
      tiempo += 6 * 60_000;
      antiban.vigilante.revisar();
      equal(cierres, 0);
    } finally {
      antiban?.vigilante.parar();
      Date.now = ahora;
    }
  }],
  ["el riesgo crítico aún provoca la reconexión protectora", () => {
    let cierres = 0;
    const sock = {
      ws: { ready: true, close: () => { cierres++; } },
      sendMessage: async () => {},
      relayMessage: async () => {},
    };
    const antiban = prepararAntiban(sock, { obtenerDb: () => ({}), encendido: true });
    if (!antiban) throw new Error("No se pudo iniciar el anti-ban");
    try {
      for (let i = 0; i < 3; i++) antiban.salud.anotarDesconexion();
      for (let i = 0; i < 8; i++) antiban.salud.anotarError(new Error("prueba"));
      antiban.salud.anotarError({ statusCode: 403, message: "prueba" });
      antiban.salud.anotarEnvio();
      antiban.salud.anotarEnvioFallido(new Error("prueba"));
      antiban.vigilante.revisar();
      equal(cierres, 1);
    } finally {
      antiban.vigilante.parar();
    }
  }],
];
