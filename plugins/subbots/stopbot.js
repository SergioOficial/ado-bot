/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * plugins/subbots/stopbot.js — `.stopbot [número]`: apagar un sub-bot.
 *
 * Sin argumentos apaga el de quien escribe (lo de siempre). Con un número, el
 * dueño puede apagar el de otra cuenta: antes no había forma de hacerlo sin
 * reiniciar el bot entero.
 */
import { puedeGestionar } from "../../lib/inventario-subbots.js";

export default {
  command: ["stopbot", "stopjadibot"],
  execute: async (ctx) => {
    const { sock, sender, args, enviartexto, jidToNumber, stopSubbot, isOwnerCheck, config } = ctx;

    const mio = String(jidToNumber ? jidToNumber(sender) : sender).replace(/\D/g, "");
    const pedido = String(args?.[0] || "").replace(/\D/g, "");
    const objetivo = pedido || mio;

    if (pedido && pedido !== mio) {
      const esOwner = Boolean(isOwnerCheck?.(sender, sock));
      if (!puedeGestionar({ quien: mio, numeroObjetivo: pedido, esOwner })) {
        return enviartexto(`🚫 Solo el dueño del bot puede apagar el sub-bot de otra cuenta.`);
      }
    }

    if (await stopSubbot(objetivo)) {
      return enviartexto(
        pedido
          ? `✅ Sub-bot *${objetivo}* detenido. Su sesión también se borró.`
          : `✅ Tu sub-bot ha sido detenido.`
      );
    }
    return enviartexto(
      `⚠️ *${objetivo}* no está activo.\n> ${config?.prefix?.[0] || "."}bots para ver cuáles hay.`
    );
  },
};
