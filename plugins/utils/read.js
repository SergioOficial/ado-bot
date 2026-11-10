/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .read (readvo, verveces) — ver el contenido de un mensaje de «ver una vez».
 *
 * Hay que citar el mensaje: el archivo no se puede pedir después, el servidor
 * lo borra. Por eso el mensaje citado trae el contenido dentro y se descarga de
 * ahí, no del chat.
 */
import { downloadContentFromMessage } from "../../lib/baileys.js";

/** Quita los envoltorios hasta llegar al contenido real. */
function desenvolver(msg) {
  let actual = msg;
  for (let i = 0; i < 6 && actual; i++) {
    const clave = [
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
      "ephemeralMessage",
      "documentWithCaptionMessage",
    ].find((c) => actual?.[c]?.message);
    if (!clave) break;
    actual = actual[clave].message;
  }
  return actual;
}

const TIPOS = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"];

export default {
  command: ["readviewonce", "read", "readvo", "verveces"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, PREFIX } = ctx;
    const info = m.message?.extendedTextMessage?.contextInfo;

    if (!info?.quotedMessage) {
      return enviartexto(
        `《✧》 Cita el mensaje de *ver una vez* y escribe *${PREFIX}read*.\n` +
          `> El archivo no se guarda en el chat: si no lo citas, no hay nada que abrir.`
      );
    }

    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } }).catch(() => {});

    try {
      const contenido = desenvolver(info.quotedMessage);
      const tipo = TIPOS.find((t) => contenido?.[t]);
      if (!tipo) {
        await sock.sendMessage(from, { react: { text: "✖️", key: m.key } }).catch(() => {});
        return enviartexto("《✧》 Ese mensaje no lleva foto, vídeo ni audio.");
      }

      const media = contenido[tipo];
      const flujo = await downloadContentFromMessage(media, tipo.replace("Message", "").toLowerCase());
      const partes = [];
      for await (const trozo of flujo) partes.push(trozo);
      const buffer = Buffer.concat(partes);

      if (!buffer.length) throw new Error("el archivo llegó vacío");

      const pie = media.caption || "";
      if (tipo === "imageMessage") await sock.sendMessage(from, { image: buffer, caption: pie }, { quoted: m });
      else if (tipo === "videoMessage") await sock.sendMessage(from, { video: buffer, mimetype: "video/mp4", caption: pie }, { quoted: m });
      else if (tipo === "audioMessage") await sock.sendMessage(from, { audio: buffer, mimetype: "audio/ogg; codecs=opus", ptt: Boolean(media.ptt) }, { quoted: m });
      else await sock.sendMessage(from, { document: buffer, mimetype: media.mimetype || "application/octet-stream", fileName: media.fileName || "archivo" }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✔️", key: m.key } }).catch(() => {});
    } catch (err) {
      await sock.sendMessage(from, { react: { text: "✖️", key: m.key } }).catch(() => {});
      await enviartexto(
        `✖️ No pude abrir ese mensaje.\n_${err.message}_\n> Suele pasar cuando ya caducó: WhatsApp borra el archivo al verlo.`
      );
    }
  },
};
