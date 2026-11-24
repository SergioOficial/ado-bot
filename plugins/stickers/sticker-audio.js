// plugins/stickers/stickeraudio.js
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
// Importamos la función específica de tu fork
import { sendModdedSticker } from 'ado-baileys/lib/sticker.js'; 

const execAsync = promisify(exec);

export default {
  command: ["stickeraudio", "sa"],
  category: "stickers",
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    const quoted = m.quoted;
    if (!quoted) return enviartexto("✍️ Responde a un video/imagen (para el sticker) **y luego** a un audio (para el sonido) citándolos.");

    // 1. Detectar si el mensaje citado es el sticker (media) o el audio
    let stickerBuffer = null;
    let audioBuffer = null;
    let isSticker = false;
    let isAudio = false;

    if (['videoMessage', 'imageMessage'].includes(quoted.mtype)) {
      isSticker = true;
      stickerBuffer = await sock.downloadMediaMessage(quoted);
    } else if (quoted.mtype === 'audioMessage') {
      isAudio = true;
      audioBuffer = await sock.downloadMediaMessage(quoted);
    }

    if (!isSticker && !isAudio) return enviartexto("⚠️ El mensaje citado no es un video, imagen o audio válido.");

    const tmpDir = path.resolve('./tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    try {
      // --- CASO 1: EL USUARIO CITÓ UN VIDEO/IMAGEN (Creamos el sticker base) ---
      if (isSticker) {
        await m.react('🕒');
        const inputPath = path.join(tmpDir, `in_${Date.now()}`);
        fs.writeFileSync(inputPath, stickerBuffer);
        const outputPath = path.join(tmpDir, `out_${Date.now()}.webp`);

        const ffmpegCmd = quoted.mtype === 'videoMessage'
          ? `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 1 -q:v 50 -loop 0 -an "${outputPath}"`
          : `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 1 -q:v 50 "${outputPath}"`;

        await execAsync(ffmpegCmd);

        // Subimos el sticker a WhatsApp para obtener los metadatos de subida
        const uploadResult = await sock.waUploadToServer(fs.readFileSync(outputPath), {
            mediaType: 'sticker',
            fileEncSha256: null, // Baileys lo genera
            fileSha256: null,
            mediaKey: null,
        });

        // Guardamos los metadatos en un archivo temporal para el siguiente paso
        fs.writeFileSync(path.join(tmpDir, `meta_${quoted.id}.json`), JSON.stringify(uploadResult));

        // Enviamos el sticker normal (para que el usuario lo vea)
        await sock.sendMessage(from, { sticker: fs.readFileSync(outputPath) }, { quoted: quoted });
        await m.react('✅');
        return enviartexto("✅ Sticker creado. Ahora **cita ese sticker** y responde con el comando `.sa` (desde un audio) para incrustarle el sonido.");
      }

      // --- CASO 2: EL USUARIO CITÓ UN AUDIO (Incrustamos el audio en el sticker) ---
      if (isAudio) {
        await m.react('🕒');
        
        // Necesitamos saber a qué sticker se le quiere poner el audio.
        // Asumimos que el audio está citando al sticker que se creó antes.
        const stickerQuoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!stickerQuoted || stickerQuoted.stickerMessage === undefined) {
             return enviartexto("⚠️ Para incrustar audio, **cita un sticker ya creado** (no una imagen/video) y responde con el audio.");
        }

        // Recuperamos los metadatos del sticker citado
        const stickerMsg = stickerQuoted.stickerMessage;
        // En un caso real, aquí buscarías el archivo meta_*.json correspondiente al sticker citado.
        // Para este ejemplo, asumimos que los metadatos están en el propio mensaje del sticker.
        
        const originalSticker = {
            url: stickerMsg.url,
            directPath: stickerMsg.directPath,
            mediaKey: stickerMsg.mediaKey,
            fileEncSha256: stickerMsg.fileEncSha256,
            fileSha256: stickerMsg.fileSha256,
            mimetype: stickerMsg.mimetype || 'image/webp',
            height: stickerMsg.height || 512,
            width: stickerMsg.width || 512,
            // ... otros metadatos necesarios
        };

        // Convertimos el audio a formato compatible (OGG/Opus)
        const audioInput = path.join(tmpDir, `audio_in_${Date.now()}`);
        fs.writeFileSync(audioInput, audioBuffer);
        const audioOutput = path.join(tmpDir, `audio_out_${Date.now()}.ogg`);
        await execAsync(`ffmpeg -y -i "${audioInput}" -c:a libopus -ac 1 -avoid_negative_ts make_zero -b:a 64k "${audioOutput}"`);
        const finalAudioBuffer = fs.readFileSync(audioOutput);

        // 🚀 AQUÍ ESTÁ LA MAGIA: Llamamos a sendModdedSticker de tu fork
        // Le pasamos el sticker original y el audio en el firstFrameSidecar
        await sendModdedSticker(sock, from, originalSticker, finalAudioBuffer, {
            quoted: m,
            // Opcional: puedes pasar más parámetros si tu función los acepta
        });

        await m.react('✅');
        fs.unlinkSync(audioInput);
        fs.unlinkSync(audioOutput);
      }

    } catch (e) {
      console.error(e);
      await m.react('❌');
      return enviartexto(`⚠️ Error: ${e.message}`);
    }
  }
};