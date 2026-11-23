/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/vinculacion.test.mjs — la pantalla del primer arranque.
 *
 * Lo que se sujeta aquí es el orden, que es lo que se rompió de verdad: el
 * cartel grande del bot limpia la pantalla, y si se pinta antes de saber si hay
 * sesión, se lleva por delante el código de vinculación. La cuenta se vincula
 * una vez; perder el código obliga a reiniciar todo.
 *
 * Las funciones de `lib/pantalla.js` solo devuelven texto, así que se prueban
 * sin abrir WhatsApp y sin ensuciar la salida de las pruebas.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { igual, esVerdad } from "./ayuda.mjs";
import {
  sesionVinculada,
  tocaPanel,
  bloqueSinSesion,
  bloqueCodigo,
  bloqueEsperando,
  bloqueVinculado,
  bloqueCaducado,
} from "../lib/pantalla.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const texto = (lineas) => lineas.join("\n");

/** El inicio de un código de escape de color, sin escribirlo entero. */
const ESC = `${String.fromCharCode(27)}[`;

export const pruebas = [
  ["sin sesión no se pinta el panel, con sesión sí", () => {
    igual(tocaPanel(undefined), false, "sin creds");
    igual(tocaPanel({}), false, "creds vacías");
    igual(tocaPanel({ registered: false }), false, "creds sin registrar");
    igual(tocaPanel({ registered: true }), true, "creds registradas");
    igual(sesionVinculada({ registered: true }), true, "sesionVinculada");
  }],
  ["el aviso de que falta vincular dice la versión y no decora", () => {
    const t = texto(bloqueSinSesion({ nombre: "Ado-Bot", version: "3.7.9" }));
    esVerdad(t.includes("3.7.9"), "no dice la versión");
    esVerdad(/sesión vinculada/i.test(t), "no explica que falta vincular");
    esVerdad(!t.includes(ESC), "lleva códigos de color: en texto plano se leen mal");
  }],
  ["el código se muestra tal cual, con el número al lado", () => {
    const t = texto(bloqueCodigo({ numero: "5215574370309", codigo: "ABCD-1234" }));
    esVerdad(t.includes("5215574370309"), "no está el número");
    esVerdad(t.includes("ABCD-1234"), "no está el código");
    esVerdad(/Dispositivos vinculados/.test(t), "no dice dónde escribirlo");
    esVerdad(/no cierres/i.test(t), "no avisa de que hay que dejarlo en pantalla");
    esVerdad(!t.includes(ESC), "lleva códigos de escape");
  }],
  ["sin código no se inventa uno", () => {
    const t = texto(bloqueCodigo({ numero: "5215574370309" }));
    esVerdad(t.includes("(no llegó)"), "debería decir que no llegó, no dejar el hueco");
    esVerdad(!t.includes("undefined"), "se coló un undefined");
  }],
  ["mientras espera, dice qué número está esperando", () => {
    const t = texto(bloqueEsperando("5215574370309"));
    esVerdad(t.includes("5215574370309"), "no nombra el número");
    esVerdad(/arranca solo/i.test(t), "no dice qué va a pasar cuando confirme");
  }],
  ["la vinculación confirmada se anuncia antes del panel", () => {
    const t = texto(bloqueVinculado({ nombre: "Ado-Bot" }));
    esVerdad(/vinculado/i.test(t), "no confirma la vinculación");
  }],
  ["el aviso de caducidad no promete que el código sirve para siempre", () => {
    const t = texto(bloqueCaducado());
    esVerdad(/caduc/i.test(t), "no habla de la caducidad");
    esVerdad(/npm start/.test(t), "no dice cómo pedir otro");
  }],
  ["el arranque mira la sesión antes de pintar el cartel", () => {
    const fuente = readFileSync(join(RAIZ, "boot/arranque.js"), "utf8");
    const cuerpo = fuente.slice(fuente.indexOf("export async function arrancar()"));
    const miraLaSesion = cuerpo.indexOf("tocaPanel(state.creds)");
    const pintaElPanel = cuerpo.indexOf("pintarLetras()");
    esVerdad(miraLaSesion > 0, "ya no se consulta si hay sesión");
    esVerdad(pintaElPanel > miraLaSesion, "se pinta el panel antes de mirar la sesión");
    esVerdad(!/^\s*pintarLetras\(\);/m.test(cuerpo.split("\n").slice(0, 8).join("\n")),
      "el panel se sigue pintando en la primera línea del arranque");
  }],
];
