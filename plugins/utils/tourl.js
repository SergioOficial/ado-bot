import axios from 'axios';
import FormData from 'form-data';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';

export default {
  command: ['tourl'],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || quoted?.imageMessage || quoted?.videoMessage;

    if (!mediaMsg) return enviartexto(`《✧》 Responde a una imagen o video con *${ctx.PREFIX}tourl* para convertirlo en URL.`);

    try {
      await sock.sendMessage(from, { react: { text: '🕒', key: m.key } });

      const buffer = await downloadMediaMessage(
        { key: m.key, message: quoted || m.message },
        "buffer",
        {},
        { logger: pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage }
      );

      // Subir a Catbox (Gratis y no requiere token)
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', buffer, 'archivo.jpg');

      const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
      });

      const link = res.data;
      await sock.sendMessage(from, { text: `✎ *Upload Exitoso*\n\nׅ✿ *Link ›* ${link}` }, { quoted: m });
      await sock.sendMessage(from, { react: { text: '✔️', key: m.key } });

    } catch (e) {
      await sock.sendMessage(from, { react: { text: '✖️', key: m.key } });
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};