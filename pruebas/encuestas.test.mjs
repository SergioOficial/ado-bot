/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { interpretar, construir, MIN_OPCIONES, MAX_OPCIONES } from "../lib/encuestas.js";

export const pruebas = [
  ["encuesta normal", () => {
    const e = interpretar("¿Pizza?|Pepperoni|Hawaiana");
    esVerdad(e.ok, "ok");
    igual(e.tipo, "encuesta", "tipo");
    igual(e.opciones, ["Pepperoni", "Hawaiana"], "opciones");
    igual(e.seleccionables, 1, "una respuesta");
  }],

  ["quiz con asterisco", () => {
    const e = interpretar("¿Capital?|Kioto|*Tokio|Osaka");
    igual(e.tipo, "quiz", "tipo");
    igual(e.correcta, 1, "índice correcto");
    igual(e.opciones[1], "Tokio", "los asteriscos se quitan");
  }],

  ["voto múltiple", () => {
    const e = interpretar("multi ¿Días?|Lun|Mar|Vie");
    igual(e.seleccionables, 3, "todas");
    igual(e.tipo, "encuesta", "no es quiz");
  }],

  ["errores con nombre", () => {
    igual(interpretar("").error, "vacio", "vacío");
    igual(interpretar("sin plecas").error, "sin-plecas", "sin |");
    igual(interpretar("¿x?|a").error, "pocas", "pocas");
    igual(interpretar("¿x?||b|c").error, "opcion-vacia", "hueco");
    igual(interpretar("|a|b").error, "sin-pregunta", "sin pregunta");
    igual(interpretar("¿x?|*a|*b|c").error, "varias-correctas", "dos correctas");
    const muchas = "¿x?|" + Array.from({ length: MAX_OPCIONES + 1 }, (_, i) => `o${i}`).join("|");
    igual(interpretar(muchas).error, "muchas", "demasiadas");
    igual(interpretar("¿x?|a|b").ok && MIN_OPCIONES === 2, true, "dos opciones sí valen");
  }],

  ["el protobuf lleva el secreto y el tipo", () => {
    const e = interpretar("¿Capital?|Kioto|*Tokio|Osaka");
    // Sin pasar por JSON: al serializar, el enum sale por su nombre ("QUIZ")
    // y la comparación con el número daría un falso fallo.
    const msg = construir(e);
    igual(msg.messageContextInfo.messageSecret.length, 32, "secreto de 32 bytes");
    igual(msg.pollCreationMessageV3.pollType, 1, "QUIZ");
    igual(msg.pollCreationMessageV3.correctAnswer.optionName, "Tokio", "correcta");
    igual(msg.pollCreationMessageV3.selectableOptionsCount, 1, "una respuesta");
  }],

  ["dos encuestas no comparten secreto", () => {
    const e = interpretar("¿x?|a|b");
    const a = construir(e).messageContextInfo.messageSecret;
    const b = construir(e).messageContextInfo.messageSecret;
    igual(a.equals(b), false, "secretos distintos");
  }],
];
