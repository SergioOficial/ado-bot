import { SunoAPI } from "sunoapi-sdk";
import axios from "axios";

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
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, BOT_NAME, config } = ctx;

    // Detección del prompt (mismo patrón que ia.js)
    let prompt = (Array.isArray(args) ? args.join(" ") : "").trim();
    if (!prompt) prompt = (m.quoted?.text || "").trim();
    if (!prompt) {
      return enviartexto(
        `✧ *${BOT_NAME}* ✧\n\nEscribe una descripción para la canción.\n` +
        `> Ejemplo: *${config.prefix[0]}iam* una balada pop sobre el atardecer en la playa`
      );
    }

    await sock.sendMessage(from, { react: { text: "🎵", key: m.key } });

    const waitMsg = await sock.sendMessage(
      from,
      { text: `❀ *Generando tu canción con Suno...* 🎶\n> _${prompt}_` },
      { quoted: m }
    );

    try {
      const suno = getSuno();

      const { taskId } = await suno.music.generate({
        prompt: prompt,
        customMode: false,
        instrumental: false,
        model: SunoAPI.Model.V6,
      });

      const record = await suno.waitForMusic(taskId);
      const track = record.response.sunoData[0];

      if (!track?.audioUrl) {
        throw new Error("Suno no devolvió un enlace de audio válido.");
      }

      const audioRes = await axios.get(track.audioUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      const audioBuffer = Buffer.from(audioRes.data);

      await sock.sendMessage(
        from,
        {
          audio: audioBuffer,
          mimetype: "audio/mp4",
          fileName: `${track.title || "suno_track"}.mp3`,
          caption: `✨ *${track.title || "Canción generada"}*\n> 🎤 ${prompt}`,
        },
        { quoted: m }
      );

      await sock.sendMessage(from, {
        text: `✅ *¡Canción lista!* 🎶\n> _${track.title || "Sin título"}_`,
        edit: waitMsg.key,
      });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en #iam:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });

      let errorMsg = e.message;
      if (e.message.includes("credits") || e.message.includes("quota")) {
        errorMsg = "Se agotaron los créditos gratuitos de Suno por hoy. Intenta mañana.";
      } else if (e.message.includes("timeout")) {
        errorMsg = "La generación tardó demasiado. Intenta con un prompt más corto.";
      }

      await sock.sendMessage(from, {
        text: `⚠️ No se pudo crear la canción.\n_${errorMsg}_`,
        edit: waitMsg.key,
      }).catch(() => {});
    }
  },
};