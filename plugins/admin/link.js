/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .link    muestra el enlace de invitación del grupo
 * .revoke  lo anula y crea uno nuevo (el viejo deja de servir)
 *
 * Si el grupo no tiene enlace, WhatsApp no da ninguno y hay que crearlo: por eso
 * se pide uno nuevo cuando `groupInviteCode` falla.
 */
import { enviarConBotones, copiar } from "../../lib/botones.js";

export default {
  command: ["link", "enlace", "revoke", "resetlink", "nuevoenlace"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, comando, enviartexto, PREFIX, config } = ctx;

    // ── anular ────────────────────────────────────────────────────────────
    if (comando === "revoke" || comando === "resetlink" || comando === "nuevoenlace") {
      try {
        const codigo = await sock.groupRevokeInvite(from);
        if (!codigo) throw new Error("WhatsApp no devolvió un enlace nuevo");
        await enviarConBotones(sock, from, {
          texto: `🔗 *Enlace nuevo*\n\nhttps://chat.whatsapp.com/${codigo}\n\n> El anterior ya no sirve.`,
          pie: config.footer,
          botones: [copiar("📋 Copiar enlace", `https://chat.whatsapp.com/${codigo}`)],
        });
        return;
      } catch (err) {
        return enviartexto(`❌ No pude anular el enlace.\n_${err.message}_\n> Necesito ser administrador.`);
      }
    }

    // ── mostrar ───────────────────────────────────────────────────────────
    let codigo = null;
    try {
      codigo = await sock.groupInviteCode(from);
    } catch (err) {
      // Grupo sin enlace: se crea uno (es lo que hace WhatsApp al pulsar
      // «Restablecer enlace»), no es un fallo del comando.
      try {
        codigo = await sock.groupRevokeInvite(from);
      } catch {
        return enviartexto(
          `⚠️ No pude leer el enlace de este grupo.\n` +
            `> Normalmente es porque no soy administrador o el grupo tiene el enlace restringido.\n` +
            `> Para anular y crear otro: *${PREFIX}revoke*`
        );
      }
    }

    if (!codigo) return enviartexto("⚠️ El grupo no tiene enlace de invitación.");

    return enviarConBotones(sock, from, {
      texto: `🔗 *Enlace del grupo*\n\nhttps://chat.whatsapp.com/${codigo}\n\n> Solo para quien deba entrar.`,
      pie: config.footer,
      botones: [copiar("📋 Copiar enlace", `https://chat.whatsapp.com/${codigo}`)],
    });
  },
};
