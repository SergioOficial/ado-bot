/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/arte.test.mjs — las imágenes del README.
 *
 * El README no lleva ni un número escrito a mano: la portada, las tarjetas y
 * las insignias se dibujan desde `scripts/arte.mjs` con los datos del día. Lo
 * que se comprueba aquí es que lo dibujado sea un SVG sano (sin scripts, sin
 * nada pedido a internet, con su texto alternativo) y que el número que se le
 * pasa sea el que acaba dentro del dibujo.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { imagenes, portada, cifras, insignia, divisor } from "../scripts/arte.mjs";

const DATOS = {
  version: "9.9.9",
  nombres: 1234,
  plugins: 567,
  categorias: 21,
  pruebas: 89,
  licencia: "AGPL-3.0-only",
  node: "20.9+",
};

/** Lo mínimo que debe tener un SVG para que GitHub no lo rechace. */
function svgSano(texto, que) {
  esVerdad(texto.startsWith("<svg") || texto.startsWith("<?xml"), `${que}: no empieza como SVG`);
  esVerdad(texto.trimEnd().endsWith("</svg>"), `${que}: no cierra el SVG`);
  esVerdad(/role="img"/.test(texto), `${que}: sin role="img"`);
  esVerdad(/aria-label="[^"]+"/.test(texto), `${que}: sin aria-label`);
  esVerdad(!/<script/i.test(texto), `${que}: lleva script, y GitHub lo va a quitar`);
  esVerdad(!/http(?!s?:\/\/www\.w3\.org)/.test(texto), `${que}: pide algo a internet`);
  esVerdad(!/<text[^>]*>undefined/.test(texto), `${que}: hay un texto sin rellenar`);
}

export const pruebas = [
  ["las imágenes salen en los dos temas y son SVG sanos", () => {
      const lista = imagenes(DATOS);
      igual(lista.length, 14, "cantidad de imágenes");
      const rutas = lista.map((i) => i.ruta);
      for (const tema of ["oscura", "clara"]) {
        esVerdad(rutas.includes(`docs/assets/portada-${tema}.svg`), `falta la portada ${tema}`);
        esVerdad(rutas.includes(`docs/assets/cifras-${tema}.svg`), `faltan las cifras ${tema}`);
        esVerdad(rutas.includes(`docs/assets/divisor-${tema}.svg`), `falta el divisor ${tema}`);
      }
      for (const { ruta, svg } of lista) svgSano(svg, ruta);
    },
  ],
  ["la portada lleva la versión y el reclamo, no un texto de relleno", () => {
      const svg = portada(DATOS, "oscura");
      esVerdad(svg.includes("v9.9.9"), "la versión no aparece en la portada");
      esVerdad(svg.includes("sin cajas negras"), "el reclamo no aparece");
      esVerdad(svg.includes("21 categorías"), "el dato de categorías no aparece");
    },
  ],
  ["las cifras se dibujan con los números que se le pasan", () => {
      const svg = cifras(DATOS, "clara");
      esVerdad(svg.includes("89/89"), "las pruebas no aparecen");
      esVerdad(svg.includes(">1234<"), "los nombres de comando no aparecen");
      esVerdad(svg.includes("nombres en 567 archivos"), "los archivos no aparecen");
      esVerdad(svg.includes(">9.9.9<"), "la versión no aparece");
    },
  ],
  ["sin pruebas contadas no se inventa un número", () => {
      const svg = cifras({ ...DATOS, pruebas: null }, "oscura");
      esVerdad(svg.includes("—"), "debería dejar un guion, no un cero");
      esVerdad(!svg.includes("null"), "se coló un null");
    },
  ],
  ["la insignia crece con el texto en vez de comerse la etiqueta", () => {
      const corta = insignia({ etiqueta: "node", valor: "20.9+", acento: "version" }, "oscura");
      const larga = insignia({ etiqueta: "licencia", valor: "AGPL-3.0-only", acento: "categorias" }, "oscura");
      const anchoDe = (svg) => Number(svg.match(/width="([\d.]+)"/)[1]);
      esVerdad(anchoDe(larga) > anchoDe(corta) + 40, "la etiqueta larga debería pedir más ancho");
      esVerdad(larga.includes("LICENCIA"), "la etiqueta va en mayúsculas");
    },
  ],
  ["las animaciones respetan a quien pidió menos movimiento", () => {
      for (const svg of [portada(DATOS, "clara"), cifras(DATOS, "clara"), insignia({ etiqueta: "x", valor: "1", acento: "pruebas" }, "clara"), divisor("clara")]) {
        esVerdad(svg.includes("prefers-reduced-motion"), "falta el apagado de animaciones");
      }
    },
  ],
];
