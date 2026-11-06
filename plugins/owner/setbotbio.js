export default {
  command: ["setbotbio"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, args, enviartexto } = ctx;
    const newBio = args.join(" ").trim();
    if (!newBio) return enviartexto("⚠️ Ingresa el texto.");
    try { await sock.updateProfileStatus(newBio); await enviartexto(`✅ *Biografía cambiada.*`); } catch { await enviartexto("❌ Error."); }
  }
};
