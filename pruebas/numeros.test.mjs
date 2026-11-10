/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { mismoNumero, numeroDe } from "../lib/grupo.js";
import { config } from "../config.js";

export const pruebas = [
  ["el mismo número con y sin lada de país coincide", () => {
    esVerdad(mismoNumero("5215574370309", "5574370309"), "México con 521");
    esVerdad(mismoNumero("525574370309", "5574370309"), "México sin el 1");
    esVerdad(mismoNumero("5574370309", "5215574370309"), "al revés");
    esVerdad(mismoNumero("5358090650", "58090650"), "Cuba con 53");
    esVerdad(mismoNumero("+52 1 55 7437 0309", "5215574370309"), "con signos y espacios");
  }],

  ["números distintos no coinciden", () => {
    esVerdad(!mismoNumero("5215574370309", "5215574370308"), "un dígito distinto");
    esVerdad(!mismoNumero("5215574370309", ""), "vacío");
    esVerdad(!mismoNumero("", ""), "dos vacíos");
    esVerdad(!mismoNumero("5215574370309", "123"), "un número corto no es el mismo");
    igual(mismoNumero(null, undefined), false, "sin datos");
  }],

  ["un LID no se toma por dueño", () => {
    esVerdad(!mismoNumero("5215574370309", "123456789012345@lid"), "el LID son otros dígitos");
    igual(numeroDe("123456789012345@lid"), "123456789012345", "numeroDe saca los dígitos");
  }],

  ["Roxi está en config y se reconoce por sus tres formas", () => {
    const dueno = (config.owners || []).find((o) => String(o.number).includes("5574370309"));
    igual(dueno?.name, "Roxi", "nombre en el comando .owner");
    esVerdad(Boolean(dueno), "está en la lista");
    for (const forma of ["5215574370309", "5574370309", "525574370309"]) {
      esVerdad(mismoNumero(dueno.number, forma), `coincide con ${forma}`);
    }
    igual((config.owners || []).length, 4, "cuatro dueños (José ya no está)");
    esVerdad(
      !(config.owners || []).some((o) => String(o.number).includes("584245610338")),
      "el número de José no quedó en la lista"
    );
  }],
];
