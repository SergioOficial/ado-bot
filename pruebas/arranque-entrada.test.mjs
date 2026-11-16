/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { strict as assert } from "node:assert";
import { PassThrough, Writable } from "node:stream";
import { pedir } from "../boot/arranque.js";

const salida = () => new Writable({ write(_trozo, _codificacion, hecho) { hecho(); } });

async function conPlazo(promesa) {
  let timer;
  try {
    return await Promise.race([
      promesa,
      new Promise((_, rechazar) => { timer = setTimeout(() => rechazar(new Error("la lectura no terminó")), 1000); }),
    ]);
  } finally { clearTimeout(timer); }
}

export const pruebas = [
  ["entrada cerrada termina la pregunta en vez de colgar el arranque", async () => {
    const entrada = new PassThrough();
    const resultado = pedir("número: ", { input: entrada, output: salida() });
    entrada.end();
    assert.equal(await conPlazo(resultado), "");
  }],
  ["el número escrito por una entrada dirigida se conserva", async () => {
    const entrada = new PassThrough();
    const resultado = pedir("número: ", { input: entrada, output: salida() });
    entrada.end("  5351234567  \n");
    assert.equal(await conPlazo(resultado), "5351234567");
  }],
];
