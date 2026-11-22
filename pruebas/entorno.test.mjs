/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/entorno.test.mjs — el `.env` y los dueños del bot
 *
 * Lo que se vigila aquí:
 *
 *   1. `env.js` lee el archivo pero NO pisa lo que ya viene del entorno:
 *      `ANTIBAN=off npm start` tiene que poder más que el `.env`.
 *   2. Sin `.env` el bot arranca igual (nadie debería romperse por no tener
 *      el archivo).
 *   3. Los números de los dueños se pueden sacar del `.env`, que es lo que
 *      permite dejar de publicar tres teléfonos reales en GitHub sin que el
 *      bot deje de reconocer a sus dueños.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Carpeta temporal con un .env dentro. */
function conEnv(contenido) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ado-env-"));
  fs.writeFileSync(path.join(dir, ".env"), contenido);
  return path.join(dir, ".env");
}

/** Corre `config.js` en un proceso aparte, con el entorno que se le pida. */
function leerConfig(extra = {}) {
  const guion = `
    const { config } = await import(${JSON.stringify(path.join(RAIZ, "config.js"))});
    process.stdout.write(JSON.stringify({ owners: config.owners, ownerNumber: config.ownerNumber }));
  `;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", guion], {
    cwd: RAIZ,
    encoding: "utf8",
    env: { ...process.env, ...extra },
  });
  if (r.status !== 0) throw new Error("config.js falló: " + (r.stderr || "").slice(0, 300));
  return JSON.parse(r.stdout);
}

export const pruebas = [
  [
    "el .env carga variables y no pisa las del entorno",
    async () => {
      const archivo = conEnv("PRUEBA_ADO_A=uno\nPRUEBA_ADO_B=\"dos\"\n");
      process.env.PRUEBA_ADO_B = "del-entorno";
      const { cargarEnv } = await import(path.join(RAIZ, "env.js").replace(/\\/g, "/"));
      const aplicadas = cargarEnv(archivo);
      if (process.env.PRUEBA_ADO_A !== "uno") throw new Error("no aplicó la variable nueva");
      if (process.env.PRUEBA_ADO_B !== "del-entorno") {
        throw new Error("pisó una variable que ya venía del entorno");
      }
      if (aplicadas !== 1) throw new Error("contó " + aplicadas + " variables aplicadas, era 1");
      delete process.env.PRUEBA_ADO_A;
      delete process.env.PRUEBA_ADO_B;
    },
  ],

  [
    "sin .env no se rompe nada",
    async () => {
      const { cargarEnv } = await import(path.join(RAIZ, "env.js").replace(/\\/g, "/"));
      const aplicadas = cargarEnv(path.join(os.tmpdir(), "no-existe-" + Date.now() + ".env"));
      if (aplicadas !== 0) throw new Error("debería aplicar 0 variables y aplicó " + aplicadas);
    },
  ],

  [
    "los dueños salen de OWNERS cuando está puesto",
    async () => {
      const { owners } = leerConfig({ OWNERS: "Ana:521111111111,Beto:529998887777" });
      if (owners.length !== 2) throw new Error("esperaba 2 dueños y hay " + owners.length);
      if (owners[0].name !== "Ana" || owners[0].number !== "521111111111") {
        throw new Error("primer dueño mal: " + JSON.stringify(owners[0]));
      }
      if (owners[1].number !== "529998887777") throw new Error("segundo dueño mal");
    },
  ],

  [
    "sin OWNERS se usa la lista de config.js (el bot sigue reconociendo a los suyos)",
    async () => {
      const { owners } = leerConfig({ OWNERS: "" });
      if (owners.length < 1) throw new Error("la lista de dueños quedó vacía");
      if (!owners.every((o) => o.number && o.name)) throw new Error("dueño sin nombre o sin número");
    },
  ],

  [
    "un OWNERS con basura no deja el bot sin dueños",
    async () => {
      const { owners } = leerConfig({ OWNERS: ":::,sin-numero" });
      if (owners.length < 1) throw new Error("un OWNERS inválido dejó la lista vacía");
      if (!owners.every((o) => o.number)) throw new Error("quedó un dueño sin número");
    },
  ],

  [
    "el .env no se sube al repositorio",
    async () => {
      const gitignore = fs.readFileSync(path.join(RAIZ, ".gitignore"), "utf8");
      const lineas = gitignore.split("\n").map((l) => l.trim());
      if (!lineas.includes(".env")) throw new Error("falta .env en .gitignore");
    },
  ],
];
