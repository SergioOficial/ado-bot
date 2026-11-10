/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .say <texto> — repetir un mensaje como el bot.
 *
 * Tres cosas que el original no hacía bien:
 *   · Con una foto o un vídeo citado, reenvía el archivo con el pie de foto
 *     (antes solo copiaba el texto).
 *   · Si mencionas a alguien con @, se le menciona de verdad (el aviso llega).
 *   · Sin texto y sin nada citado, explica cómo se usa en vez de quedarse muda.
 */
import { downloadMediaMessage } from "../../lib/baileys.js";

const MAX_TEXTO = 2000;

/** Tipo real del mensaje, mirando también los envoltorios (ver una vez, etc.). */
function desenvolver(msg) {
  if (!msg) return null;
  for (const clave of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage"]) {
    if (msg[clave]?.message) return desenvolver(msg[clave].message);
  }
  return msg;
}

function tipoDe(msg) {
  const m = desenvolver(msg);
  if (!m) return { tipo: null };
  for (const t of ["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"]) {
    if (m[t]) return { tipo: t, contenido: m[t] };
  }
  return { tipo: null, contenido: m.conversation ? { text: m.conversation } : m.extendedTextMessage };
}

/** Números mencionados con @ en el texto que existen en el grupo. */
async function mencionesReales(sock, from, isGroup, texto) {
  if (!isGroup || !texto.includes("@")) return [];
  const meta = await sock.groupMetadata(from).catch(() => null);
  const participantes = (meta?.participants || []).map((p) => p.id).filter(Boolean);
  return participantes.filter((jid) => texto.includes(jid.split("@")[0]));
}

export default {
  command: ["say", "decir"],
  execute: async (ctx) => {
    const { sock, from, m, isGroup, args, enviartexto, PREFIX } = ctx;

    const citado = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ? {
          message: m.message.extendedTextMessage.contextInfo.quotedMessage,
          key: {
            remoteJid: from,
            id: m.message.extendedTextMessage.contextInfo.stanzaId,
            participant: m.message.extendedTextMessage.contextInfo.participant,
          },
        }
      : null;

    const fuente = citado || m;
    const { tipo, contenido } = tipoDe(fuente.message);
    const escrito = (args || []).join(" ").trim();
    const delCitado = (contenido?.caption || contenido?.text || "").trim();
    const texto = (escrito || delCitado).slice(0, MAX_TEXTO);

    const menciones = await mencionesReales(sock, from, isGroup, texto);
    const opciones = { mentions: menciones };

    try {
      // Media citada: se reenvía el archivo con el texto como pie.
      if (tipo && tipo !== "stickerMessage") {
        const media = await downloadMediaMessage(fuente, "buffer", {}, {
          logger: undefined,
          reuploadRequest: sock.updateMediaMessage,
        });
        const paquete = { ...opciones };
        if (tipo === "imageMessage") Object.assign(paquete, { image: media, caption: texto });
        else if (tipo === "videoMessage") Object.assign(paquete, { video: media, mimetype: "video/mp4", caption: texto });
        else if (tipo === "audioMessage") Object.assign(paquete, { audio: media, mimetype: "audio/mp4" });
        else Object.assign(paquete, { document: media, caption: texto, mimetype: "application/octet-stream" });
        return sock.sendMessage(from, paquete);
      }

      if (tipo === "stickerMessage") {
        const media = await downloadMediaMessage(fuente, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });
        return sock.sendMessage(from, { sticker: media });
      }

      if (texto) return sock.sendMessage(from, { text, ...opciones });

      return enviartexto(
        `《✧》 Escríbeme qué quiero decir, o cita el mensaje que quieres repetir.\n> Ejemplo: *${PREFIX}say hola a todos*`
      );
    } catch (err) {
      return enviartexto(`⚠️ No pude repetir eso.\n_${err.message}_`);
    }
  },
};
