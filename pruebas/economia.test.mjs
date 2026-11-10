/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { leerApuesta, pagarRuleta, colorDe, dinero, cobrarPlazo, usuario, DIA } from "../lib/economia.js";
import { jugarPPT } from "../plugins/economia/apuestas.js";

export const pruebas = [
  ["formato del dinero", () => {
    igual(dinero(0), "¥0", "cero");
    igual(dinero(1500000), "¥1,500,000", "millones");
    igual(dinero("nada"), "¥0", "basura");
  }],

  ["la apuesta se valida", () => {
    const u = { coins: 10_000 };
    igual(leerApuesta(u, "500").ok, true, "válida");
    igual(leerApuesta(u, "500").cantidad, 500, "cantidad");
    igual(leerApuesta(u, "all").cantidad, 10_000, "all");
    igual(leerApuesta(u, "20000").ok, false, "más de lo que hay");
    igual(leerApuesta(u, "-5").ok, false, "negativa");
    igual(leerApuesta(u, "2.5").ok, false, "decimal");
    igual(leerApuesta(u, "abc").ok, false, "texto");
    igual(leerApuesta(u, "0").ok, false, "cero");
  }],

  ["colores de la ruleta", () => {
    igual(colorDe(0), "verde", "cero");
    igual(colorDe(1), "rojo", "1");
    igual(colorDe(2), "negro", "2");
    igual(colorDe(36), "rojo", "36");
  }],

  ["pagos de la ruleta: color ×2, número ×36, cero para la casa", () => {
    const c = 1000;
    // 17 es negro: apostar a negro acierta
    const acierto = pagarRuleta(17, { tipo: "color", valor: "negro" }, c);
    igual(acierto.gana, true, "acierta color");
    igual(acierto.devuelve, 2000, "devuelve ×2");

    const fallo = pagarRuleta(17, { tipo: "color", valor: "rojo" }, c);
    igual(fallo.devuelve, 0, "falla color");

    const numero = pagarRuleta(17, { tipo: "numero", valor: 17 }, c);
    igual(numero.devuelve, 36000, "número ×36");

    const cero = pagarRuleta(0, { tipo: "paridad", valor: "par" }, c);
    igual(cero.gana, false, "el cero gana para la casa");

    const par = pagarRuleta(4, { tipo: "paridad", valor: "par" }, c);
    igual(par.gana, true, "par acierta");
  }],

  ["piedra, papel o tijera", () => {
    igual(jugarPPT("piedra", "tijera"), "gana", "piedra gana a tijera");
    igual(jugarPPT("piedra", "papel"), "pierde", "piedra pierde con papel");
    igual(jugarPPT("tijera", "tijera"), "empata", "empate");
    igual(jugarPPT("papel", "piedra"), "gana", "papel gana a piedra");
  }],

  ["los plazos no se pueden cobrar dos veces", () => {
    const u = { coins: 0 };
    const primera = cobrarPlazo(u, "lastWeekly", 7 * DIA, () => 100_000);
    igual(primera.ok, true, "primera");
    igual(u.coins, 100_000, "abona");
    const segunda = cobrarPlazo(u, "lastWeekly", 7 * DIA, () => 100_000);
    igual(segunda.ok, false, "segunda bloqueada");
    esVerdad(segunda.espera > 6 * DIA, "dice cuánto falta");
    igual(u.coins, 100_000, "no abona otra vez");
  }],

  ["la caja del usuario crea los campos sin romper saldos", () => {
    const db = { users: { "a@s": { coins: "5000" } } };
    const u = usuario(db, "a@s");
    igual(u.coins, 5000, "convierte texto a número");
    igual(u.bank, 0, "banco");
    igual(u.coffer, 0, "caja fuerte");
  }],
];
