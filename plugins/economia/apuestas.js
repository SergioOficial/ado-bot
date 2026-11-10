/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .ppt <piedra|papel|tijera> <apuesta>       empate = te devuelven lo apostado
 * .roulette <rojo|negro|par|impar|0-36> <apuesta>   ruleta europea de verdad
 * .casino <1-10> <apuesta>                  adivina el número, paga ×9
 *
 * Lo que se corrigió respecto al JS:
 *   · Las apuestas se validan en un solo sitio (enteras, nunca más que el
 *     efectivo) y el banco no se puede apostar.
 *   · La ruleta es la europea de 37 casillas con sus pagos reales (×2 color y
 *     paridad, ×36 número). Antes era un `Math.random() < 0.5` disfrazado.
 *   · Se dice siempre qué salió, gane o pierda: sin eso, la gente desconfía (y
 *     con razón).
 */
import { usuario, leerApuesta, dinero, pagarRuleta } from "../../lib/economia.js";

const OPCIONES_PPT = { piedra: "piedra", papel: "papel", tijera: "tijera", rock: "piedra", p: "piedra", r: "papel", t: "tijera" };

/** Devuelve "gana" | "pierde" | "empata" desde el punto de vista del jugador. */
export function jugarPPT(jugador, maquina) {
  if (jugador === maquina) return "empata";
  const gana = { piedra: "tijera", papel: "piedra", tijera: "papel" };
  return gana[jugador] === maquina ? "gana" : "pierde";
}

export default {
  command: ["ppt", "piedrapapel", "roulette", "ruleta", "casino"],
  execute: async (ctx) => {
    const { sender, args, comando, db, enviartexto, PREFIX } = ctx;
    const u = usuario(db, sender);

    // ── piedra, papel o tijera ────────────────────────────────────────────
    if (comando === "ppt" || comando === "piedrapapel") {
      const eleccion = OPCIONES_PPT[String(args[0] || "").toLowerCase()];
      const apuesta = leerApuesta(u, args[1]);

      if (!eleccion || !apuesta.ok) {
        return enviartexto(
          `✊ *Piedra, papel o tijera*\n\n> Uso: *${PREFIX}ppt <piedra|papel|tijera> <apuesta>*\n` +
            `> Ejemplo: ${PREFIX}ppt piedra 5000\n> ${apuesta.error || ""}`
        );
      }

      const maquina = ["piedra", "papel", "tijera"][Math.floor(Math.random() * 3)];
      const resultado = jugarPPT(eleccion, maquina);
      let texto;

      if (resultado === "gana") {
        u.coins += apuesta.cantidad;
        texto = `✊ *Ganaste*\n\n> Tú: *${eleccion}* · Yo: *${maquina}*\n> +${dinero(apuesta.cantidad)}`;
      } else if (resultado === "pierde") {
        u.coins -= apuesta.cantidad;
        texto = `✊ *Perdiste*\n\n> Tú: *${eleccion}* · Yo: *${maquina}*\n> −${dinero(apuesta.cantidad)}`;
      } else {
        texto = `✊ *Empate*\n\n> Los dos: *${maquina}*\n> Te quedas igual, no se cobra nada.`;
      }

      db.saveDatabase?.();
      return enviartexto(`${texto}\n\n💰 Balance: *${dinero(u.coins)}*`);
    }

    // ── ruleta ────────────────────────────────────────────────────────────
    if (comando === "roulette" || comando === "ruleta") {
      const tipo = String(args[0] || "").toLowerCase();
      const apuesta = leerApuesta(u, args[1]);

      let opcion = null;
      if (["rojo", "negro"].includes(tipo)) opcion = { tipo: "color", valor: tipo };
      else if (["par", "impar"].includes(tipo)) opcion = { tipo: "paridad", valor: tipo };
      else if (/^\d{1,2}$/.test(tipo) && Number(tipo) <= 36) opcion = { tipo: "numero", valor: Number(tipo) };

      if (!opcion || !apuesta.ok) {
        return enviartexto(
          `🎡 *Ruleta europea* (0–36)\n\n` +
            `> *${PREFIX}roulette <rojo|negro> <apuesta>* — paga ×2\n` +
            `> *${PREFIX}roulette <par|impar> <apuesta>* — paga ×2 (el 0 gana para la casa)\n` +
            `> *${PREFIX}roulette <0-36> <apuesta>* — paga ×36\n` +
            `> Ejemplo: ${PREFIX}roulette rojo 10000\n> ${apuesta.error || ""}`
        );
      }

      const numero = Math.floor(Math.random() * 37); // 0–36
      const pago = pagarRuleta(numero, opcion, apuesta.cantidad);

      if (pago.gana) u.coins += pago.devuelve - apuesta.cantidad; // se descuenta la apuesta y se suma el pago
      else u.coins -= apuesta.cantidad;

      db.saveDatabase?.();
      return enviartexto(
        `🎡 *${pago.gana ? "¡Acertaste!" : "No salió"}*\n\n` +
          `> ${pago.detalle}\n` +
          `> ${pago.gana ? `+${dinero(pago.devuelve - apuesta.cantidad)}` : `−${dinero(apuesta.cantidad)}`}\n\n` +
          `💰 Balance: *${dinero(u.coins)}*`
      );
    }

    // ── casino: adivina el número ─────────────────────────────────────────
    const elegido = Number(args[0]);
    const apuesta = leerApuesta(u, args[1]);
    if (!Number.isInteger(elegido) || elegido < 1 || elegido > 10 || !apuesta.ok) {
      return enviartexto(
        `🎰 *Casino*\n\n> Uso: *${PREFIX}casino <1-10> <apuesta>*\n` +
          `> Si aciertas el número, pagas ×9.\n> Ejemplo: ${PREFIX}casino 7 5000\n> ${apuesta.error || ""}`
      );
    }

    const salio = Math.floor(Math.random() * 10) + 1;
    const acerto = salio === elegido;
    if (acerto) u.coins += apuesta.cantidad * 8; // ×9 total: se suma 8 y se queda la apuesta
    else u.coins -= apuesta.cantidad;

    db.saveDatabase?.();
    return enviartexto(
      `🎰 *${acerto ? "¡PREMIO!" : "Sigue probando"}*\n\n` +
        `> Elegiste *${elegido}* · salió *${salio}*\n` +
        `> ${acerto ? `+${dinero(apuesta.cantidad * 8)}` : `−${dinero(apuesta.cantidad)}`}\n\n` +
        `💰 Balance: *${dinero(u.coins)}*`
    );
  },
};
