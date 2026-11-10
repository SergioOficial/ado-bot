#!/usr/bin/env node
/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * scripts/vigia.mjs — arranca el bot y lo vuelve a levantar si se cae.
 *
 * Uso:
 *   npm run vigia            (equivalente a npm start, pero con vigía)
 *   npm run vigia -- --code  (lo mismo pasando argumentos a index.js)
 *
 * Para pararlo: Ctrl+C.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearSupervisor, VENTANA_MS } from "./supervisor.mjs";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARGS = process.argv.slice(2);

const hora = () => new Date().toTimeString().slice(0, 8);
const decir = (texto) => console.log(`\x1b[90m[${hora()}]\x1b[0m ${texto}`);

const supervisor = crearSupervisor({
  raiz: RAIZ,
  argumentos: ARGS,
  ganchos: {
    arrancado: () => decir("bot arrancado"),
    pidioReiniciar: ({ reinicios }) => decir(`el bot pidió reiniciar (reinicio nº ${reinicios})`),
    reiniciando: () => decir("levantando otra vez…"),
    cayo: ({ code, signal, esperaMs }) => {
      const como = signal ? `con la señal ${signal}` : `con código ${code}`;
      decir(`se cayó ${como}; lo levanto en ${(esperaMs / 1000).toFixed(1)} s`);
    },
    rendido: ({ caidas }) => {
      console.error(
        `\n  ✗ El bot se cayó ${caidas} veces en ${VENTANA_MS / 1000} s.` +
          `\n  Eso no se arregla reiniciando: mira el error de arriba.` +
          `\n  Dejo de intentarlo; arráncalo tú cuando esté resuelto.\n`
      );
    },
    parado: ({ motivo }) => {
      if (motivo === "parado") decir("vigía detenido");
    },
  },
});

const cerrar = () => {
  supervisor.parar();
  setTimeout(() => process.exit(0), 300);
};

process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);

const final = await supervisor.ejecutar();
if (final === "rendido") process.exit(1);
