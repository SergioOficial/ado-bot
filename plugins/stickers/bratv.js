import axios from "axios";
import { Sticker } from "wa-sticker-formatter";

export default {
  command: ["bratv", "bratvid", "bratanimado"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, config } = ctx;

    // 1. Obtener el texto (de los argumentos o del mensaje citado)
    let text = args.join(" ").trim();
    if (!text) {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) text = quoted.conversation || quoted.extendedTextMessage?.text;
    }

    if (!text) {
      return enviartexto("《✧》 Por favor, responde a un mensaje o ingresa un texto para crear el sticker animado.");
    }

    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

    try {
      // 2. Obtener el video de la API
      const res = await axios.get(`https://skyzxu-brat.hf.space/brat-animated`, {
        params: { text },
        responseType: "arraybuffer",
        timeout: 30000
      });

      if (!res.data) throw new Error("La API no devolvió el video.");

      const videoBuffer = Buffer.from(res.data);

      // 3. Metadatos del sticker (usando config o los del usuario si los tuvieras)
      const pack = config.botName || "Ado-Bot";
      const author = config.ownerName || "Sergio Dev";

      // 4. Convertir el video a sticker animado
      const sticker = new Sticker(videoBuffer, {
        pack,
        author,
        type: "full",
        quality: 70
      });

      const stickerBuffer = await sticker.toBuffer();

      // 5. Enviar el sticker
      await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✔️", key: m.key } });

    } catch (e) {
      console.error("Error en #bratv:", e.message);
      await sock.sendMessage(from, { react: { text: "✖️", key: m.key } });
      await enviartexto(`❌ Error al crear el sticker animado:\n_${e.message}_`);
    }
  }
};