/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .logout — cerrar la sesión y borrar los archivos del sub-bot.
 *
 * Solo tiene sentido dentro de un sub-bot: la sesión del bot principal no se
 * borra desde un comando (sería muy fácil quedarse fuera de tu propio bot por un
 * error de tecleo). Aquí se cierra la conexión, se borra la carpeta de la sesión
 * y se olvida el número, para que no vuelva a arrancar solo al reiniciar.
 */
import { borrarSesion } from "../../lib/subbots.js";

export default {
  command: ["logout"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, enviartexto, PREFIX, stopSubbot } = ctx;

    const esSub = Boolean(sock?.esSubbot);
    const numero = sock?.numeroSubbot || null;

    if (!esSub || !numero) {
      return enviartexto(
        "⚠️ *Este comando es de los sub-bots.*\n\n" +
          "> Este bot es el principal: su sesión no se cierra desde WhatsApp.\n" +
          `> Para apagar un sub-bot: *${PREFIX}stopbot*`
      );
    }

    await enviartexto(
      "🔌 *Cerrando la sesión…*\n\n" +
        "> Se borran las credenciales de este sub-bot.\n" +
        `> Para volver, pide un código nuevo con *${PREFIX}code*.`
    );

    let borrada = false;
    try {
      await sock.logout?.();
    } catch (err) {
      console.error("⚠️ No se pudo cerrar la sesión:", err?.message || err);
    }
    try {
      borrada = borrarSesion(numero);
    } catch (err) {
      console.error("⚠️ No se pudo borrar la sesión de", numero, err?.message || err);
    }
    try {
      await stopSubbot?.(numero);
    } catch {
      /* si el gestor ya lo dio por parado, da igual */
    }

    // Este mensaje sale por el socket que se acaba de cerrar: si falla, ya está
    // todo hecho y el registro queda en el log.
    console.log(`🔌 Sesión del sub-bot ${numero} cerrada${borrada ? " y borrada" : ""}.`);
  },
};
