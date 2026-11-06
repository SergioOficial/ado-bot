import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { Sticker } from "wa-sticker-formatter";
import pino from "pino";
export default {
  command: ["sticker", "s"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config } = ctx;
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
    if (!quoted.imageMessage && !quoted.videoMessage) return enviartexto("《✧》 Responde a imagen o video.");
    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });
    try {
      const buffer = await downloadMediaMessage({ key: m.key, message: quoted }, "buffer", {}, { logger: pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage });
      const sticker = new Sticker(buffer, { pack: config.botName, author: config.ownerName, type: 'full', quality: 70 });
      await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) { await enviartexto(`⚠️ Error: ${e.message}`); }
  }
};
