/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { aMorse, aTexto } from "../plugins/utils/morse.js";

export const pruebas = [
  ["ida y vuelta", () => {
    for (const frase of ["SOS", "HOLA MUNDO", "123", "SHIN MD"]) {
      igual(aTexto(aMorse(frase)).texto, frase, frase);
    }
  }],
  ["espacio = barra", () => {
    igual(aMorse("A B"), ".- / -...", "barra");
    igual(aTexto(".- / -...").texto, "A B", "vuelta");
  }],
  ["cuenta los grupos raros en vez de tragárselos", () => {
    const r = aTexto("... xyz ....");
    igual(r.raros, 1, "uno raro");
    igual(r.texto, "S?H", "marcado con ?");
  }],
  ["signos", () => {
    igual(aTexto(aMorse("?")).texto, "?", "interrogación");
    esVerdad(aMorse("@").length > 0, "arroba");
  }],
];
