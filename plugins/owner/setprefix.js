/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .setprefix — cambiar el prefijo de los comandos sin reiniciar.
 *
 * El prefijo vivía en `config.js` y había que editar el archivo. Ahora se guarda
 * en la base (`lib/ajustes.js`) y el router lo lee en cada mensaje, así que el
 * siguiente mensaje ya entra por el prefijo nuevo.
 */
import { leerAjustes, fijarAjuste, borrarAjuste, prefijosDe } from "../../lib/ajustes.js";

export default {
  command: ["setprefix", "prefix", "prefijo"],
  isOwner: true,
  execute: async (ctx) => {
    const { args, enviartexto, db, config, PREFIX } = ctx;
    const pedido = args.join(" ").trim();
    const actual = prefijosDe(db, config).join(" · ");

    if (!pedido) {
      return enviartexto(
        `⚙️ *Prefijo actual:* ${actual}\n\n` +
          `> Para cambiarlo: *.setprefix #*\n` +
          `> Para volver al de fábrica: *.setprefix reset*`
      );
    }

    if (/^(reset|restablecer|default)$/i.test(pedido)) {
      borrarAjuste(db, "prefijo");
      const vuelta = prefijosDe(db, config);
      return enviartexto(`✅ *Prefijo restablecido.*\n> Ahora: ${vuelta.join(" · ")}`);
    }

    // Un prefijo son uno o dos caracteres que no sean letras ni números: con una
    // letra, medio idioma se vuelve un comando y el bot contesta a todo.
    if (/\s/.test(pedido)) {
      return enviartexto("⚠️ El prefijo no puede llevar espacios.");
    }
    if (/[a-z0-9]/i.test(pedido)) {
      return enviartexto(
        "⚠️ El prefijo no puede llevar letras ni números.\n> Con una letra, cualquier palabra empezaría un comando."
      );
    }
    if (pedido.length > 2) {
      return enviartexto("⚠️ El prefijo tiene que ser de uno o dos caracteres como mucho.");
    }

    fijarAjuste(db, "prefijo", pedido);
    await enviartexto(
      `✅ *Prefijo cambiado.*\n\n> Antes: ${PREFIX}\n> Ahora: *${pedido}*\n\n_Ejemplo: ${pedido}menu_`
    );
  },
};
