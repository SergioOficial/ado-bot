import { downloadContentFromMessage } from "@whiskeysockets/baileys";
export default {
  command: ["setbotpp"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, m, enviartexto, jidToNumber } = ctx;
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const img = m.message?.imageMessage || quoted?.imageMessage;
    if (!img) return enviartexto("⚠️ Responde a una imagen.");
    try {
      await enviartexto("⏳ Actualizando foto...");
      const stream = await downloadContentFromMessage(img, "image");
      let buffer = Buffer.from([]); for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      await sock.updateProfilePicture(jidToNumber(sock.user.id) + "@s.whatsapp.net", buffer);
      await enviartexto("✅ Foto actualizada.");
    } catch { await enviartexto("❌ Error."); }
  }
};
