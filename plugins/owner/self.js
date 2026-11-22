/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .self — dejar el bot para el dueño (modo privado).
 *
 * Encendido, el bot IGNORA por completo a quien no sea dueño: no contesta, no
 * avisa, no gasta cuota. Es lo que se quiere cuando el número es personal y no
 * un bot de grupo. El router es quien lo hace cumplir (`boot/router.js`).
 */
import { leerAjustes, fijarAjuste, modoPrivado } from "../../lib/ajustes.js";

const AVISO = [
  "🔒 *Modo privado encendido*",
  "",
  "El bot ya solo atiende a sus dueños. A los demás los ignora en silencio:",
  "no les contesta ni les avisa de nada.",
  "",
  "> Para volver a atender a todos: *.self off*",
].join("\n");

export default {
  command: ["self", "privado"],
  isOwner: true,
  execute: async (ctx) => {
    const { args, enviartexto, db } = ctx;
    const orden = String(args[0] || "").toLowerCase();
    const encendido = modoPrivado(db);

    if (["on", "enable", "activar", "si", "sí", "1"].includes(orden)) {
      if (encendido) return enviartexto("🔒 El modo privado ya estaba encendido.");
      fijarAjuste(db, "privado", true);
      return enviartexto(AVISO);
    }

    if (["off", "disable", "desactivar", "no", "0"].includes(orden)) {
      if (!encendido) return enviartexto("🔓 El modo privado ya estaba apagado.");
      fijarAjuste(db, "privado", false);
      return enviartexto("🔓 *Modo privado apagado.*\n> El bot vuelve a atender a todo el que le escriba.");
    }

    const ajustes = leerAjustes(db);
    void ajustes;
    return enviartexto(
      `*🔐 Modo privado*\n\n` +
        `> Estado: *${encendido ? "encendido" : "apagado"}*\n\n` +
        `Encendido, el bot solo contesta a sus dueños y al resto lo ignora.\n\n` +
        `> Encender: *.self on*\n> Apagar: *.self off*`
    );
  },
};
