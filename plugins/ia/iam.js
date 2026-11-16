import { SunoAPI } from "sunoapi-sdk";
import axios from "axios";
import fs from "fs";

// ⚠️ Reemplaza esto con tu API Key de sunoapi.org
// o mejor, usa process.env.SUNO_API_KEY
const SUNO_API_KEY = process.env.SUNO_API_KEY || "c56eb844c3b6abdf7c9d04a8cd5c675e";

let sunoClient = null;
function getSuno() {
  if (!sunoClient) {
    sunoClient = new SunoAPI({ apiKey: SUNO_API_KEY });
  }
  return sunoClient;
}

export default {
  command: ["iam", "iamusica", "suno", "musicai"],
  category: "ia",
  run: async (client, m, args, usedPrefix, command, text) => {
    // 1. Detección robusta del prompt (igual que en tu comando .ia)
    let prompt = (Array.isArray(args) ? args.join(" ") : "").trim();
    if (!prompt) prompt = (m.quoted?.text || "").trim();
    if (!prompt) {
      return client.reply(
        m.chat,
        `《✧》 Escribe una descripción para la canción.\n> Ejemplo: *${usedPrefix + command}* una balada pop sobre el atardecer en la playa`,
        m
      );
    }

    await m.react("🎵");
    const waitMsg = await client.sendMessage(
      m.chat,
      { text: `❀ *Generando tu canción con Suno...* 🎶\n> _${prompt}_` },
      { quoted: m }
    );

    try {
      const suno = getSuno();

      // 2. Generar la canción (modo libre: la IA crea la letra)
      const { taskId } = await suno.music.generate({
        prompt: prompt,
        customMode: false, // false → la IA crea letra y estilo a partir del prompt
        instrumental: false, // true si quieres solo música sin voz
        model: SunoAPI.Model.V6, // o "V6_MINI" para mayor velocidad
        // callBackUrl: "..." // Opcional, si tienes un webhook público
      });

      // 3. Esperar a que termine (polling interno del SDK)
      const record = await suno.waitForMusic(taskId);
      const track = record.response.sunoData[0];

      if (!track?.audioUrl) {
        throw new Error("Suno no devolvió un enlace de audio válido.");
      }

      // 4. Descargar el audio y enviarlo
      const audioRes = await axios.get(track.audioUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      const audioBuffer = Buffer.from(audioRes.data);

      // Enviar como audio (se reproduce en el chat y se puede descargar)
      await client.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: "audio/mp4", // o "audio/mpeg" según el formato que devuelva Suno
          fileName: `${track.title || "suno_track"}.mp3`,
          caption: `✨ *${track.title || "Canción generada"}*\n> 🎤 ${prompt}`,
        },
        { quoted: m }
      );

      // 5. Editar el mensaje de espera y reaccionar
      await client.sendMessage(m.chat, {
        text: `✅ *¡Canción lista!* 🎶\n> _${track.title || "Sin título"}_`,
        edit: waitMsg.key,
      });
      await m.react("✅");

    } catch (e) {
      console.error("Error en .iam:", e.message);
      await m.react("❌");

      let errorMsg = e.message;
      if (e.message.includes("credits") || e.message.includes("quota")) {
        errorMsg = "Se agotaron los créditos gratuitos de Suno por hoy. Intenta mañana.";
      } else if (e.message.includes("timeout")) {
        errorMsg = "La generación tardó demasiado. Intenta con un prompt más corto.";
      }

      await client.sendMessage(m.chat, {
        text: `⚠️ No se pudo crear la canción.\n_${errorMsg}_`,
        edit: waitMsg.key,
      }).catch(() => {});
    }
  },
};