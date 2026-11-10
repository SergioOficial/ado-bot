/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import {
  agregar, pendientesDe, borrar, vencidos, textoAviso, esperaLegible, MAX_TEXTO, MAX_MINUTOS,
} from "../lib/recordatorios.js";

const T0 = 1_700_000_000_000;
const nuevo = () => ({});

export const pruebas = [
  ["guarda y calcula la hora", () => {
    const db = nuevo();
    const r = agregar(db, { chat: "a@s", autor: "u1", texto: "tomar agua", minutos: 5, ahora: T0 });
    esVerdad(r.ok, "ok");
    igual(r.cuando, T0 + 5 * 60_000, "cuando");
  }],

  ["no vence antes de tiempo", () => {
    const db = nuevo();
    agregar(db, { chat: "a@s", autor: "u1", texto: "x", minutos: 5, ahora: T0 });
    igual(vencidos(db, T0 + 4 * 60_000).length, 0, "a los 4 min");
  }],

  ["vence a su hora y una sola vez", () => {
    const db = nuevo();
    agregar(db, { chat: "a@s", autor: "u1", texto: "x", minutos: 5, ahora: T0 });
    igual(vencidos(db, T0 + 5 * 60_000).length, 1, "primera");
    igual(vencidos(db, T0 + 5 * 60_000).length, 0, "segunda (no se repite)");
  }],

  ["rechaza minutos que no son número o son 0", () => {
    igual(agregar(nuevo(), { chat: "a", autor: "u", texto: "x", minutos: 0 }).error, "minutos", "cero");
    igual(agregar(nuevo(), { chat: "a", autor: "u", texto: "x", minutos: "2abc" }).error, "minutos", "texto");
  }],

  ["rechaza mensaje vacío", () => {
    igual(agregar(nuevo(), { chat: "a", autor: "u", texto: "  ", minutos: 3 }).error, "texto", "vacío");
  }],

  ["recorta el mensaje largo y avisa", () => {
    const r = agregar(nuevo(), { chat: "a", autor: "u", texto: "x".repeat(MAX_TEXTO + 50), minutos: 3 });
    esVerdad(r.recortado, "recortado");
  }],

  ["tope de 24 h", () => {
    const r = agregar(nuevo(), { chat: "a", autor: "u", texto: "x", minutos: 999_999 });
    igual(r.minutos, MAX_MINUTOS, "minutos topados");
  }],

  ["cada quien ve solo los suyos", () => {
    const db = nuevo();
    agregar(db, { chat: "a@s", autor: "u1", texto: "1", minutos: 5 });
    agregar(db, { chat: "a@s", autor: "u2", texto: "2", minutos: 9 });
    igual(pendientesDe(db, "a@s", "u2").length, 1, "u2");
    igual(pendientesDe(db, "a@s", "u1")[0].texto, "1", "u1");
  }],

  ["solo el dueño borra su aviso", () => {
    const db = nuevo();
    const r = agregar(db, { chat: "a@s", autor: "u1", texto: "x", minutos: 5 });
    igual(borrar(db, "a@s", "u2", r.id), false, "ajeno");
    igual(borrar(db, "a@s", "u1", r.id), true, "dueño");
    igual(pendientesDe(db, "a@s", "u1").length, 0, "ya no está");
  }],

  ["los vencidos de hace más de 7 días se tiran", () => {
    const db = nuevo();
    agregar(db, { chat: "a@s", autor: "u1", texto: "x", minutos: 1, ahora: T0 });
    const avisos = vencidos(db, T0 + 8 * 24 * 60 * 60_000);
    esVerdad(avisos.length >= 0, "no revienta");
    igual(db.recordatorios.lista.length, 0, "base limpia");
  }],

  ["esperaLegible y textoAviso", () => {
    igual(esperaLegible(3 * 3_600_000 + 12 * 60_000), "3 h 12 min", "horas");
    igual(esperaLegible(90_000), "1 min 30 s", "minutos");
    esVerdad(textoAviso({ texto: "agua", creado: T0 }, T0 + 5 * 60_000).includes("hace 5 min"), "texto");
  }],
];
