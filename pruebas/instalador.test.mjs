/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/instalador.test.mjs — lo que puede romper una instalación.
 *
 * Dos cosas se rompieron de verdad y aquí quedan sujetas:
 *
 *   · el instalador escribía el registro del verificador en /tmp, y en Termux
 *     —que es donde se instala esto la mayoría de las veces— /tmp no existe.
 *     El instalador moría en el último paso, después de haber trabajado.
 *   · el verificador contaba los fallos y aun así terminaba en 0, así que el
 *     instalador decía «todo en su sitio» con un plugin roto dentro. Como los
 *     dos se encadenan, el error se tapaba entre los dos.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { esVerdad } from "./ayuda.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta) => readFileSync(join(RAIZ, ruta), "utf8");

/** Las líneas que de verdad se ejecutan: los comentarios no cuentan. */
const codigo = (texto) =>
  texto
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .join("\n");

export const pruebas = [
  ["el instalador no escribe en /tmp a pelo", () => {
    const ejecutable = codigo(leer("instalar.sh"));
    esVerdad(!/\/tmp\//.test(ejecutable), "volvió a aparecer una ruta /tmp en el código");
  }],
  ["el instalador guarda el registro donde el sistema tenga temporal", () => {
    const texto = leer("instalar.sh");
    esVerdad(/mktemp/.test(texto), "debería pedir el temporal con mktemp");
    esVerdad(/\$DIR\/\.ado-verificar\.log/.test(texto), "falta el plan B dentro del propio repo");
    esVerdad(!/Mira el final de/.test(texto), "el aviso viejo hablaba de /tmp y ya no aplica");
  }],
  ["el verificador termina en error cuando algo falla", () => {
    const texto = leer("scripts/verificar.mjs");
    esVerdad(/if \(fallos\)/.test(texto), "no comprueba la cuenta de fallos al terminar");
    const resumen = texto.slice(texto.lastIndexOf("// ── Resumen"));
    esVerdad(/process\.exit\(1\)/.test(resumen), "el resumen no devuelve código de error");
    esVerdad(/fallos\+\+/.test(texto), "nadie cuenta los fallos");
  }],
];
