import fs from "fs";
export default {
  command: ["prueba", "pba"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    const { performance } = await import("perf_hooks");
    const CANAL_URL = "https://whatsapp.com/channel/0029Vb758GP6rsQkqWy5Xm2j";
    const CANAL_JID = "120363425322183138@newsletter";
    const CANAL_NOMBRE = "⍪❖Ƭʜᴇ Kakashi—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const localImagePath = "/storage/emulated/0/Pictures/WhatsApp/IMG-20261103-WA0027.jpg";

    if (!fs.existsSync(localImagePath)) return enviartexto("❌ No se encontró la imagen local.");

    const start = performance.now();
    await sock.sendMessage(from, { react: { text: "🌿", key: m.key } });
    const end = performance.now();
    const latencia = (end - start).toFixed(3);
    const pingMsg = `ׄ ⋆ ⚙🌿 ̊. *𝐏𝐎𝐍𝐆*\n> ʚଓ 𝙑𝙚𝙡𝙤𝙘𝙞𝙙𝙖𝙙: *${latencia}* ms`;

    await sock.sendMessage(from, {
      image: { url: localImagePath },
      caption: pingMsg,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: CANAL_JID, newsletterName: CANAL_NOMBRE, serverMessageId: 1 }
      }
    }, { quoted: m });
  }
};
