/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { apuntar, masActivos, menosActivos, hace, MAX_PERSONAS } from "../lib/actividad.js";
import { leerFecha } from "../plugins/perfil/ficha.js";

export const pruebas = [
  ["cuenta mensajes por persona y grupo", () => {
    const db = {};
    apuntar(db, "g@s", "a@s", 1000);
    apuntar(db, "g@s", "a@s", 2000);
    apuntar(db, "g@s", "b@s", 3000);
    igual(db.chats["g@s"].actividad["a@s"].total, 2, "a");
    igual(db.chats["g@s"].actividad["a@s"].ultimo, 2000, "último");
    igual(db.chats["g@s"].actividad["b@s"].total, 1, "b");
  }],

  ["los grupos se cuentan por separado", () => {
    const db = {};
    apuntar(db, "g1@s", "a@s");
    apuntar(db, "g2@s", "a@s");
    igual(masActivos(db, "g1@s")[0].total, 1, "g1");
    igual(masActivos(db, "g2@s")[0].total, 1, "g2");
  }],

  ["ranking de los que más hablan", () => {
    const db = {};
    for (let i = 0; i < 5; i++) apuntar(db, "g@s", "a@s");
    for (let i = 0; i < 2; i++) apuntar(db, "g@s", "b@s");
    igual(masActivos(db, "g@s").map((x) => x.jid), ["a@s", "b@s"], "orden");
  }],

  ["los inactivos incluyen a quien nunca escribió y excluyen admins", () => {
    const db = {};
    apuntar(db, "g@s", "a@s");
    const miembros = [
      { id: "a@s", admin: null },
      { id: "b@s", admin: null },
      { id: "admin@s", admin: "admin" },
    ];
    const lista = menosActivos(db, "g@s", miembros, 10);
    igual(lista.map((x) => x.jid), ["b@s", "a@s"], "b nunca escribió, admin fuera");
  }],

  ["el contador tiene tope por grupo", () => {
    const db = { chats: { "g@s": { actividad: {} } } };
    for (let i = 0; i < MAX_PERSONAS; i++) db.chats["g@s"].actividad[`u${i}@s`] = { total: 1, ultimo: 1 };
    igual(apuntar(db, "g@s", "nuevo@s"), false, "no añade más");
    igual(apuntar(db, "g@s", "u1@s"), true, "a uno que ya está sí");
  }],

  ["hace() en palabras", () => {
    const ahora = 10 * 86_400_000;
    igual(hace(0, ahora), "nunca", "sin fecha");
    igual(hace(ahora - 1000, ahora), "hoy", "hoy");
    igual(hace(ahora - 86_400_000, ahora), "ayer", "ayer");
    igual(hace(ahora - 5 * 86_400_000, ahora), "hace 5 días", "días");
    igual(hace(ahora - 65 * 86_400_000, ahora), "hace 2 meses", "meses");
  }],

  ["fechas de cumpleaños válidas y no", () => {
    igual(leerFecha("14/03/2003"), { dia: 14, mes: 3, anio: 2003 }, "completa");
    igual(leerFecha("01/12"), { dia: 1, mes: 12, anio: null }, "sin año");
    igual(leerFecha("29/02/2024"), { dia: 29, mes: 2, anio: 2024 }, "bisiesto");
    igual(leerFecha("29/02/2023"), null, "no bisiesto");
    igual(leerFecha("32/01/2000"), null, "día 32");
    igual(leerFecha("14/13/2000"), null, "mes 13");
    igual(leerFecha("mañana"), null, "texto");
    igual(leerFecha("14/03/1800"), null, "año absurdo");
  }],
];
