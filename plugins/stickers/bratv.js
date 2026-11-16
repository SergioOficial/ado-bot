/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Adaptado de Shin-MD: cmds/stickers/bratv.js.
 */
import { Sticker } from "wa-sticker-formatter";
import { pedirSeguro } from "../../lib/red-segura.js";
import { asegurarEntrada } from "../../lib/sticker-seguro.js";

export function crearBratv({ pedir = pedirSeguro, sticker = (datos, opciones) => new Sticker(datos, opciones) } = {}) {
  return {
    command: ["bratv"],
    execute: async ({ sock, from, m, args, enviartexto, config }) => {
      const citado = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const texto = (args.join(" ").trim() || citado?.conversation || citado?.extendedTextMessage?.text || "").trim();
      if (!texto) return enviartexto("《✧》 Responde o escribe un texto para el video-sticker.");
      if (texto.length > 300) return enviartexto("⚠️ El texto puede tener hasta 300 caracteres.");
      try {
        const url = new URL("https://skyzxu-brat.hf.space/brat-animated");
        url.searchParams.set("text", texto);
        const res = await pedir(url.toString(), { max: 5 * 1024 * 1024, plazo: 15_000 });
        if (res.estado !== 200) throw new Error(`El servicio respondió HTTP ${res.estado}.`);
        const datos = asegurarEntrada(res.buffer);
        if (datos.length < 12 || datos.subarray(4, 8).toString("ascii") !== "ftyp") {
          throw new Error("El servicio no devolvió un video MP4 válido.");
        }
        const salida = await sticker(datos, { pack: config.botName, author: config.ownerName, type: "full", quality: 70 }).toBuffer();
        await sock.sendMessage(from, { sticker: salida }, { quoted: m });
      } catch (err) {
        console.error("⚠️ Error en bratv:", err?.stack || err);
        await enviartexto(`⚠️ No pude crear el video-sticker: ${err?.message || "error desconocido"}`);
      }
    },
  };
}

export default crearBratv();
