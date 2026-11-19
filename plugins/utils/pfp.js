/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .getpic [@quien | número] — foto de perfil en grande.
 *
 * Acepta mención, mensaje citado o número escrito. Si la persona la tiene
 * privada, WhatsApp no devuelve nada y el comando lo dice; no se manda una
 * imagen de relleno.
 */
import { objetivo, numeroDe, mencion } from "../../lib/grupo.js";

export default {
  command: ["pfp", "getpic", "fotoperfil", "perfilpic"],
  execute: async (ctx) => {
    const { sock, from, m, sender, db, enviartexto, PREFIX } = ctx;

    // 1. Resolver objetivo: mención/citado mediante objetivo(ctx)
    let jid = objetivo(ctx);

    // 2. Fallback: número escrito en el texto (8–15 dígitos)
    if (!jid) {
      const texto = String(ctx.text || "").trim();
      const numero = texto.replace(/\D/g, "");
      if (numero.length >= 8 && numero.length <= 15) {
        jid = `${numero}@s.whatsapp.net`;
      }
    }

    // 3. Si no hay objetivo válido, usar el propio remitente
    jid = jid || sender;

    await sock.sendMessage(from, { react: { text: "🖼️", key: m.key } }).catch(() => {});

    const enlace = await sock
      .profilePictureUrl(jid, "image", { url: "image" })
      .catch(() => null);

    if (!enlace) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
      return enviartexto(
        `《✧》 *${numeroDe(jid)}* no tiene foto pública (o la tiene solo para sus contactos).\n` +
          `> No hay nada que mostrar: no voy a inventar una imagen.\n` +
          `> Uso: *${PREFIX}getpic @alguien* o *${PREFIX}getpic 521234567890*`
      );
    }

    try {
      return await sock.sendMessage(
        from,
        {
          image: { url: enlace },
          caption: `🖼️ Foto de perfil de ${mencion(jid, db)}`,
        },
        { quoted: m }
      );
    } catch (err) {
      await sock.sendMessage(from, { react: { text: "⚠️", key: m.key } }).catch(() => {});
      return enviartexto(
        `⚠️ Encontré la foto pero no pude mandarla.\n_${err.message}_`
      );
    }
  },
};