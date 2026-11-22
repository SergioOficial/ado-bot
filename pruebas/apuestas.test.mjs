/** riokuroxi — https://github.com/riokuroxi-svg · Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import apuestas from "../plugins/economia/apuestas.js";

/** Contexto mínimo con una cartera de 10 000 coins. */
function contexto(args) {
  const db = { users: { "5215500000001@s.whatsapp.net": { coins: 10_000, bank: 0, coffer: 0 } }, saveDatabase() {} };
  const respuestas = [];
  return {
    db,
    respuestas,
    ctx: {
      sender: "5215500000001@s.whatsapp.net",
      args,
      comando: "ppt",
      db,
      PREFIX: ".",
      enviartexto: async (t) => respuestas.push(t),
    },
  };
}

export const pruebas = [
  [
    "ppt acepta el orden nuevo: primero la jugada, después la apuesta",
    async () => {
      const { ctx, respuestas, db } = contexto(["piedra", "1000"]);
      await apuestas.execute(ctx);
      esVerdad(/Ganaste|Perdiste|Empate/.test(respuestas[0]), respuestas[0]);
      const coins = db.users["5215500000001@s.whatsapp.net"].coins;
      esVerdad([10_000, 11_000, 9_000].includes(coins), `saldo inesperado: ${coins}`);
    },
  ],
  [
    "ppt sigue aceptando el orden viejo: primero la apuesta (el de antes de unificar)",
    async () => {
      const { ctx, respuestas } = contexto(["1000", "tijera"]);
      await apuestas.execute(ctx);
      esVerdad(/Ganaste|Perdiste|Empate/.test(respuestas[0]), respuestas[0]);
    },
  ],
  [
    "ppt avisa cuando no entiende la jugada",
    async () => {
      const { ctx, respuestas } = contexto(["mil", "nada"]);
      await apuestas.execute(ctx);
      esVerdad(/Piedra, papel o tijera/.test(respuestas[0]), respuestas[0]);
    },
  ],
  [
    "el cofre misterioso y la caja fuerte ya no comparten el alias «caja»",
    async () => {
      const cofre = (await import("../plugins/economia/cofre.js")).default;
      const coffer = (await import("../plugins/economia/coffer.js")).default;
      esVerdad(!cofre.command.includes("caja"), "el cofre no puede quedarse con «caja»");
      esVerdad(!coffer.command.includes("caja"), "la caja fuerte tampoco");
      const repetidos = cofre.command.filter((c) => coffer.command.includes(c));
      igual(repetidos.length, 0, `nombres compartidos: ${repetidos.join(", ")}`);
    },
  ],
];
