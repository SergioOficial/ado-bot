/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .setchannel — el canal de WhatsApp que el bot comparte en el menú.
 *
 * Se acepta el enlace tal cual (`https://whatsapp.com/channel/0029Vb…`) y se
 * guarda el identificador; también vale el identificador suelto.
 */
import { fijarAjuste, borrarAjuste, canalDelBot, esCanal } from "../../lib/ajustes.js";

/** Saca el identificador de un enlace de canal, o null si no lo parece. */
export function idDeCanal(texto) {
  const limpio = String(texto || "").trim();
  const enlace = limpio.match(/whatsapp\.com\/channel\/([A-Za-z0-9]{10,})/i);
  if (enlace) return enlace[1];
  if (/^[A-Za-z0-9]{10,}$/.test(limpio)) return limpio;
  return null;
}

export default {
  command: ["setchannel", "setbotchannel", "setcanal"],
  isOwner: true,
  execute: async (ctx) => {
    const { args, enviartexto, db, PREFIX } = ctx;
    const valor = args.join(" ").trim();
    const actual = canalDelBot(db);

    if (!valor) {
      return enviartexto(
        `📢 *Canal actual:* ${actual ? `${actual.nombre} (${actual.jid})` : "_ninguno_"}\n\n` +
          `> Cambiarlo: *${PREFIX}setchannel https://whatsapp.com/channel/…*\n` +
          `> Quitarlo: *${PREFIX}setchannel reset*`
      );
    }

    if (/^(reset|quitar|default|off)$/i.test(valor)) {
      borrarAjuste(db, "canal");
      return enviartexto("✅ *Canal quitado.*\n> El menú ya no comparte ningún canal.");
    }

    const id = idDeCanal(valor);
    if (!id) {
      return enviartexto(
        "⚠️ No reconozco ese canal.\n> Pega el enlace completo: *https://whatsapp.com/channel/0029…*"
      );
    }

    const jid = `${id}@newsletter`;
    if (!esCanal(jid)) return enviartexto("⚠️ El identificador del canal no tiene la forma esperada.");

    // El nombre es opcional: `.setchannel <enlace> | <nombre>`
    const [, nombre] = valor.split("|").map((t) => t.trim());
    fijarAjuste(db, "canal", { jid, nombre: nombre || "Canal oficial" });

    await enviartexto(`✅ *Canal guardado.*\n\n> ${nombre || "Canal oficial"}\n> ${jid}`);
  },
};
