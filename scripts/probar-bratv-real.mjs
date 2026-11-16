/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Prueba explícita de red y conversión; no conecta con WhatsApp.
 */
import fs from "node:fs";
import path from "node:path";
import plugin from "../plugins/stickers/bratv.js";

let sticker = null;
let aviso = "";
await plugin.execute({
  args: ["prueba roxi"],
  from: "prueba@g.us",
  m: { key: { id: "PRUEBA" } },
  config: { botName: "Prueba", ownerName: "Roxi" },
  enviartexto: (texto) => { aviso = texto; },
  sock: { sendMessage: async (_jid, contenido) => { sticker = contenido.sticker; } },
});

if (!Buffer.isBuffer(sticker) || sticker.subarray(0, 4).toString() !== "RIFF" || sticker.subarray(8, 12).toString() !== "WEBP" || !sticker.includes(Buffer.from("ANIM"))) {
  console.error(`❌ No se obtuvo un WebP animado. ${aviso}`);
  process.exitCode = 1;
} else {
  const destino = path.join(process.cwd(), "tmp", "bratv-prueba.webp");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, sticker);
  console.log(`✅ Servicio remoto y FFmpeg: WebP animado (${sticker.length} bytes), guardado en tmp/bratv-prueba.webp.`);
  console.log("No se ha enviado a WhatsApp; la entrega real requiere una sesión vinculada.");
}
