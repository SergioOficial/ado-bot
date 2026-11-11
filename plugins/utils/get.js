/**
 * ado-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .get <url> — pedir un enlace y devolver el texto o el archivo. Solo el dueño.
 *
 * Pedir una URL desde el servidor del bot es pedir la red interna del servidor
 * si nadie lo impide, así que el comando es de dueño y pasa por
 * lib/red-segura.js (IPs privadas, DNS, redirecciones, tamaño y plazo).
 */
import { pedirSeguro, MAX_DESCARGA } from "../../lib/red-segura.js";

const MAX_TEXTO = 3000;

function esTexto(tipo) {
  const t = String(tipo).toLowerCase();
  return ["text/", "application/json", "application/xml", "application/javascript"].some((p) =>
    t.startsWith(p)
  );
}

function nombreDeArchivo(ruta, tipo) {
  const partes = String(ruta).split("/").filter(Boolean);
  const ultimo = partes[partes.length - 1];
  if (ultimo && ultimo.includes(".")) return decodeURIComponent(ultimo);
  if (String(tipo).startsWith("image/")) return "archivo.png";
  if (String(tipo).startsWith("application/pdf")) return "archivo.pdf";
  if (String(tipo).startsWith("audio/")) return "archivo.ogg";
  if (String(tipo).startsWith("video/")) return "archivo.mp4";
  return "archivo.bin";
}

export default {
  command: ["get", "fetch", "pedir"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, PREFIX } = ctx;

    const enlace = (args || []).join(" ").trim();
    if (!enlace) {
      return enviartexto(
        `《✧》 Escríbeme el enlace.\n> Ejemplo: *${PREFIX}get https://api.github.com/repos/SergioOficial/ado-bot*`
      );
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } }).catch(() => {});

    try {
      const { buffer, tipo, estado } = await pedirSeguro(enlace);
      const host = new URL(enlace).host;

      if (esTexto(tipo)) {
        const texto = buffer.toString("utf8");
        return enviartexto(
          `《⊛》 *${host}* · ${estado}\n\`\`\`${texto.slice(0, MAX_TEXTO)}${
            texto.length > MAX_TEXTO ? "\n… (recortado)" : ""
          }\`\`\``
        );
      }

      if (String(tipo).startsWith("image/")) {
        return sock.sendMessage(from, { image: buffer, caption: `《⊛》 ${host}` }, { quoted: m });
      }

      return sock.sendMessage(
        from,
        {
          document: buffer,
          mimetype: tipo || "application/octet-stream",
          fileName: nombreDeArchivo(new URL(enlace).pathname, tipo),
          caption: `《⊛》 ${host} · ${(buffer.length / 1024).toFixed(1)} KB`,
        },
        { quoted: m }
      );
    } catch (err) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
      return enviartexto(`🚫 ${err.message}\n> Tope por descarga: ${MAX_DESCARGA / 1048576} MB.`);
    }
  },
};
