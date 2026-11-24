import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default {
  command: ["stickeraudio", "sa", "sticker-audio"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;

    // 1. Verificar que el mensaje sea una respuesta (quote) a un video/imagen
    const quoted = m.quoted ? m.quoted : null;
    if (!quoted) {
      return enviartexto(
        "✍️ *Uso correcto:*\n" +
        "> Responde a un *video o imagen* con el comando.\n" +
        "> Si quieres añadir audio, responde primero al video/imagen y luego envía el audio como otro mensaje citado.\n\n" +
        "> Ejemplo: Responde a un video con `.sa` y luego responde a ese sticker con una nota de voz usando `.sa`."
      );
    }

    const type = quoted.mtype || quoted.type;
    const isVideo = type === 'videoMessage' || type === 'video';
    const isImage = type === 'imageMessage' || type === 'image';
    const isAudio = type === 'audioMessage' || type === 'audio' || (type === 'documentMessage' && quoted.msg?.mimetype?.startsWith('audio'));

    // 2. Si es un video o imagen, crear el sticker
    if (isVideo || isImage) {
      await m.react('🕒');
      let mediaBuffer;

      try {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
      } catch (e) {
        await m.react('❌');
        return enviartexto(`⚠️ No se pudo descargar el archivo: ${e.message}`);
      }

      if (!mediaBuffer) {
        await m.react('❌');
        return enviartexto("⚠️ El archivo multimedia vino vacío.");
      }

      const tempDir = path.resolve('./tmp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const inputPath = path.join(tempDir, `input_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
      fs.writeFileSync(inputPath, mediaBuffer);

      const outputPath = path.join(tempDir, `sticker_${Date.now()}.webp`);

      try {
        // Comando ffmpeg para convertir a sticker WebP (estático o animado)
        // -vf: escala a 512x512 manteniendo proporción y rellena con fondo transparente
        // -c:v libwebp: codificador WebP
        // -lossless 1: máxima calidad (para stickers)
        // -q:v 50: calidad
        // -loop 0: bucle infinito para animados
        // -preset default: velocidad
        const ffmpegCmd = isVideo
          ? `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 1 -q:v 50 -loop 0 -preset default -an "${outputPath}"`
          : `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 1 -q:v 50 "${outputPath}"`;

        await execAsync(ffmpegCmd);

        const stickerBuffer = fs.readFileSync(outputPath);

        // Enviar el sticker
        await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: quoted });

        await m.react('✅');

        // Limpiar archivos temporales
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

      } catch (e) {
        console.error("Error al crear sticker:", e);
        await m.react('❌');
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return enviartexto(`⚠️ Error al procesar el sticker: ${e.message}`);
      }
    }
    // 3. Si es un audio, enviarlo como nota de voz
    else if (isAudio) {
      await m.react('🕒');
      let audioBuffer;

      try {
        audioBuffer = await sock.downloadMediaMessage(quoted);
      } catch (e) {
        await m.react('❌');
        return enviartexto(`⚠️ No se pudo descargar el audio: ${e.message}`);
      }

      if (!audioBuffer) {
        await m.react('❌');
        return enviartexto("⚠️ El audio vino vacío.");
      }

      const tempDir = path.resolve('./tmp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const inputPath = path.join(tempDir, `audio_in_${Date.now()}.ogg`);
      fs.writeFileSync(inputPath, audioBuffer);

      const outputPath = path.join(tempDir, `audio_out_${Date.now()}.ogg`);

      try {
        // Convertir a formato compatible con notas de voz de WhatsApp (OGG/Opus)
        // Flags recomendadas: -c:a libopus -ac 1 -avoid_negative_ts make_zero
        const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -c:a libopus -ac 1 -avoid_negative_ts make_zero -b:a 64k "${outputPath}"`;
        await execAsync(ffmpegCmd);

        const finalAudioBuffer = fs.readFileSync(outputPath);

        // Enviar el audio como nota de voz (ptt: true)
        await sock.sendMessage(from, {
          audio: finalAudioBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        }, { quoted: quoted });

        await m.react('✅');

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

      } catch (e) {
        console.error("Error al procesar audio:", e);
        await m.react('❌');
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return enviartexto(`⚠️ Error al procesar el audio: ${e.message}`);
      }
    }
    else {
      return enviartexto("⚠️ El mensaje citado no es un video, imagen ni audio válido.");
    }
  }
};