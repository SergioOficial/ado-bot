/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .setlink — el enlace del bot (el que sale en el menú y en la ficha).
 */
import { fijarAjuste, borrarAjuste, enlaceDelBot } from "../../lib/ajustes.js";

export default {
  command: ["setlink", "setbotlink", "setenlace"],
  isOwner: true,
  execute: async (ctx) => {
    const { args, enviartexto, db, config, PREFIX } = ctx;
    const valor = args.join(" ").trim();
    const actual = enlaceDelBot(db, config);

    if (!valor) {
      return enviartexto(
        `🔗 *Enlace del bot:* ${actual}\n\n> Cambiarlo: *${PREFIX}setlink https://…*\n> Volver al de fábrica: *${PREFIX}setlink reset*`
      );
    }

    if (/^(reset|restablecer|default)$/i.test(valor)) {
      borrarAjuste(db, "enlace");
      return enviartexto(`✅ *Enlace restablecido.*\n> Ahora: ${enlaceDelBot(db, config)}`);
    }

    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(valor)) {
      return enviartexto("⚠️ Tiene que ser un enlace completo, empezando por *http://* o *https://*.");
    }
    if (valor.length > 200) {
      return enviartexto("⚠️ El enlace es demasiado largo (más de 200 caracteres).");
    }

    fijarAjuste(db, "enlace", valor);
    await enviartexto(`✅ *Enlace cambiado.*\n\n> ${valor}`);
  },
};
