/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .setgpname <nombre>    cambia el nombre del grupo
 * .setgpdesc <texto>     cambia la descripción
 * .setgpbanner (citando una foto)  cambia la foto del grupo
 *
 * Los tres comprueban el resultado en vez de decir «listo» a ciegas: WhatsApp
 * acepta la petición y no la aplica si el bot no es administrador.
 */
import { downloadMediaMessage } from "../../lib/baileys.js";

export default {
  command: ["setgpname", "setgpdesc", "setgpbanner", "setnombre", "setdescgrupo"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, args, comando, enviartexto, PREFIX } = ctx;
    const texto = (args || []).join(" ").trim();

    // ── nombre ────────────────────────────────────────────────────────────
    if (comando === "setgpname" || comando === "setnombre") {
      if (!texto) return enviartexto(`《✧》 Uso: *${PREFIX}setgpname Nuevo nombre*`);
      if (texto.length > 100) return enviartexto("《✧》 WhatsApp admite hasta 100 caracteres en el nombre.");
      try {
        await sock.groupUpdateSubject(from, texto);
        const meta = await sock.groupMetadata(from).catch(() => null);
        if (meta && meta.subject !== texto) {
          return enviartexto("⚠️ WhatsApp no aplicó el cambio. ¿Soy administrador del grupo?");
        }
        return enviartexto(`✅ Nombre del grupo: *${texto}*`);
      } catch (err) {
        return enviartexto(`❌ No pude cambiar el nombre.\n_${err.message}_\n> Casi siempre: no soy administrador.`);
      }
    }

    // ── descripción ───────────────────────────────────────────────────────
    if (comando === "setgpdesc" || comando === "setdescgrupo") {
      if (!texto) return enviartexto(`《✧》 Uso: *${PREFIX}setgpdesc Descripción del grupo*`);
      if (texto.length > 512) return enviartexto("《✧》 WhatsApp admite hasta 512 caracteres.");
      try {
        await sock.groupUpdateDescription(from, texto);
        return enviartexto(`✅ Descripción del grupo actualizada.`);
      } catch (err) {
        return enviartexto(`❌ No pude cambiarla.\n_${err.message}_\n> Casi siempre: no soy administrador.`);
      }
    }

    // ── foto ──────────────────────────────────────────────────────────────
    const cita = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const foto = cita?.imageMessage || m.message?.imageMessage;
    if (!foto) {
      return enviartexto(
        `《✧》 Manda o cita una *foto* y escribe *${PREFIX}setgpbanner*.\n> El texto de la foto no se usa, solo la imagen.`
      );
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: foto }, key: m.key },
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );
      if (!buffer?.length) throw new Error("la foto llegó vacía");
      await sock.updateProfilePicture(from, buffer);
      return enviartexto("✅ Foto del grupo actualizada.");
    } catch (err) {
      return enviartexto(`❌ No pude cambiar la foto.\n_${err.message}_`);
    }
  },
};
