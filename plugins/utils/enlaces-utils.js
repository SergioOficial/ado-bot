/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .acortar <url>   acorta un enlace
 * .tourl           sube el archivo que citas (o mandas) y te da el enlace
 *
 * `.tourl` usa uguu.se porque es de los pocos que sigue aceptando subidas sin
 * clave. Se probaron antes 0x0.st (cerró las subidas por spam de bots), catbox
 * (rechaza la subida desde servidores) y tmpfiles (solo acepta imágenes y
 * vídeos). No se promete que dure para siempre: si algún día falla, el comando
 * lo dice.
 */
import { downloadMediaMessage } from "../../lib/baileys.js";
import { acortar, subirArchivo } from "../../lib/consultas.js";

export default {
  command: ["acortar", "short", "shorturl", "tourl", "subir"],
  execute: async (ctx) => {
    const { sock, from, m, args, comando, enviartexto, PREFIX } = ctx;

    // ── acortar ───────────────────────────────────────────────────────────
    if (comando === "acortar" || comando === "short" || comando === "shorturl") {
      const enlace = (args || []).join(" ").trim();
      if (!/^https?:\/\//i.test(enlace)) {
        return enviartexto(`《✧》 Uso: *${PREFIX}acortar https://ejemplo.com/ruta/larga*`);
      }
      try {
        const corto = await acortar(enlace);
        return enviartexto(`🔗 *Enlace corto*\n\n${corto}\n\n> Original: ${enlace.slice(0, 200)}`);
      } catch (err) {
        return enviartexto(`⚠️ No pude acortarlo: ${err.message}`);
      }
    }

    // ── subir a URL ───────────────────────────────────────────────────────
    const info = m.message?.extendedTextMessage?.contextInfo;
    const citado = info?.quotedMessage;
    const contenido = citado || m.message;

    const tipo = ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].find(
      (t) => contenido?.[t]
    );
    if (!tipo) {
      return enviartexto(
        `《✧》 Manda o cita un *archivo* (foto, vídeo, audio o documento) y escribe *${PREFIX}tourl*.\n` +
          `> Te devuelvo un enlace público para compartirlo.`
      );
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } }).catch(() => {});
    try {
      const buffer = await downloadMediaMessage(
        { message: contenido, key: m.key },
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );
      const datos = contenido[tipo];
      const nombre =
        datos?.fileName ||
        `archivo.${tipo === "imageMessage" ? "jpg" : tipo === "videoMessage" ? "mp4" : tipo === "audioMessage" ? "ogg" : "bin"}`;

      const enlace = await subirArchivo(buffer, nombre);
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } }).catch(() => {});
      return enviartexto(
        `🔗 *Archivo subido*\n\n${enlace}\n\n> ${(buffer.length / 1024).toFixed(0)} KB · el enlace caduca con el tiempo (el servicio no dice cuándo).`
      );
    } catch (err) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
      return enviartexto(`⚠️ No pude subirlo: ${err.message}`);
    }
  },
};
