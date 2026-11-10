/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .weekly  (semanal)   — cada 7 días, con racha
 * .monthly (mensual)   — cada 30 días
 * .einfo   (economía)  — cómo funciona el dinero del bot
 *
 * Los plazos se guardan en campos nuevos (`lastWeekly`, `lastMonthly`) para no
 * tocar los que ya usa `.daily`: cambiar los existentes le reiniciaría la racha
 * a todo el mundo.
 */
import { usuario, dinero, falta, cobrarPlazo, DIA } from "../../lib/economia.js";

const SEMANAL = { campo: "lastWeekly", plazo: 7 * DIA, base: 100_000, maxRacha: 10 };
const MENSUAL = { campo: "lastMonthly", plazo: 30 * DIA, base: 250_000, maxRacha: 6 };

function premio(base, racha, maxRacha) {
  // Crece con la racha pero tiene techo: si no, el que lleva dos años
  // reclamando cobraría más que toda la economía del bot.
  const escalon = Math.min(racha, maxRacha);
  return base * (1 + 0.1 * (escalon - 1));
}

export default {
  command: ["weekly", "semanal", "monthly", "mensual", "einfo", "economia"],
  execute: async (ctx) => {
    const { sender, comando, db, enviartexto, PREFIX, config } = ctx;
    const u = usuario(db, sender);

    if (comando === "einfo" || comando === "economia") {
      return enviartexto(
        `💰 *Cómo funciona el dinero*\n\n` +
          `│ Efectivo › *${dinero(u.coins)}*\n│ Banco › *${dinero(u.bank)}*\n│ Caja fuerte › *${dinero(u.coffer)}*\n\n` +
          `*Cómo se gana*\n` +
          `▸ ${PREFIX}daily — cada 24 h, con racha\n` +
          `▸ ${PREFIX}weekly — cada 7 días\n` +
          `▸ ${PREFIX}monthly — cada 30 días\n` +
          `▸ ${PREFIX}work — cada 3 min\n` +
          `▸ ${PREFIX}beg — limosna, con espera\n\n` +
          `*Cómo se pierde o se guarda*\n` +
          `▸ ${PREFIX}rob te roba del *efectivo*; la caja fuerte (${PREFIX}coffer) no se toca\n` +
          `▸ ${PREFIX}dep / ${PREFIX}with mueven entre efectivo y banco\n` +
          `▸ ${PREFIX}cf, ${PREFIX}slots, ${PREFIX}dice, ${PREFIX}ppt, ${PREFIX}roulette, ${PREFIX}casino apuestan efectivo\n\n` +
          `> Solo se apuesta lo que hay en efectivo, nunca el banco.\n${config.footer}`
      );
    }

    const plan = comando === "weekly" || comando === "semanal" ? SEMANAL : MENSUAL;
    const rachaActual = Number(u[`racha_${plan.campo}`]) || 0;
    const resultado = cobrarPlazo(u, plan.campo, plan.plazo, () =>
      premio(plan.base, Math.min(rachaActual + 1, plan.maxRacha), plan.maxRacha)
    );

    if (!resultado.ok) {
      const nombre = plan === SEMANAL ? "semanal" : "mensual";
      return enviartexto(
        `《✧》 Ya cobraste el premio ${nombre}.\n> Vuelve en *${falta(resultado.espera)}*.\n> Mientras tanto: *${PREFIX}daily* o *${PREFIX}work*.`
      );
    }

    u[`racha_${plan.campo}`] = rachaActual + 1;
    db.saveDatabase?.();

    const titulo = plan === SEMANAL ? "Recompensa Semanal" : "Recompensa Mensual";
    const siguiente = premio(plan.base, Math.min(rachaActual + 2, plan.maxRacha), plan.maxRacha);

    return enviartexto(
      `「✿」*${titulo}*\n\n` +
        `🔥 ¡Reclamado *${dinero(resultado.premio)}*! (racha: *${rachaActual + 1}*)\n` +
        `> La próxima: *${dinero(siguiente)}*\n\n` +
        `💰 Balance: *${dinero(u.coins)}*\n` +
        `> ${config.footer}`
    );
  },
};
