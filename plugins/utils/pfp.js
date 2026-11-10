/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .pfp [@quien] — foto de perfil en grande.
 *
 * Pide la foto en tamaño completo. Si la persona la tiene privada, WhatsApp no
 * devuelve nada y el comando lo dice; no se manda una imagen de relleno.
 */
import { objetivo, numeroDe, mencion } from "../../lib/grupo.js";

export default {
  command: ["pfp", "getpic", "fotoperfil", "perfilpic"],
  execute: async (ctx) => {
    const { sock, from, m, sender, db, enviartexto, PREFIX } = ctx;

    const jid = objetivo(ctx) || sender;
    await sock.sendMessage(from, { react: { text: "🖼️", key: m.key } }).catch(() => {});

    const enlace = await sock
      .profilePictureUrl(jid, "image", { url: "image" })
      .catch(() => null);

    if (!enlace) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
      return enviartexto(
        `《✧》 *${numeroDe(jid)}* no tiene foto pública (o la tiene solo para sus contactos).\n` +
          `> No hay nada que mostrar: no voy a inventar una imagen.\n` +
          `> Uso: *${PREFIX}pfp @alguien*`
      );
    }

    try {
      return await sock.sendMessage(
        from,
        { image: { url: enlace }, caption: `🖼️ Foto de perfil de ${mencion(jid, db)}` },
        { quoted: m }
      );
    } catch (err) {
      return enviartexto(`⚠️ Encontré la foto pero no pude mandarla.\n_${err.message}_`);
    }
  },
};
