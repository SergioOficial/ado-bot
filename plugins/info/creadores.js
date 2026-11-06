export default {
  command: ["creadores", "creators", "owner", "creator", "creador", "owners"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, config, BOT_NAME } = ctx;
    const owners = config.owners || [];
    if (!owners.length) return enviartexto("❌ No hay creadores configurados.");
    const buildVCard = (name, number) => {
      const clean = String(number).replace(/[^\d]/g, "");
      return ["BEGIN:VCARD", "VERSION:3.0", `FN:${name}`, `ORG:${BOT_NAME};`, `TEL;type=CELL;type=VOICE;waid=${clean}:+${clean}`, "END:VCARD"].join("\n");
    };
    const contacts = owners.map(o => ({ vcard: buildVCard(o.name, o.number) }));
    try {
      await sock.sendMessage(from, { contacts: { displayName: owners.length > 1 ? `${owners.length} Creadores` : owners[0].name, contacts } }, { quoted: m });
    } catch (err) {
      const fallback = owners.map(o => `👑 *${o.name}* — wa.me/${String(o.number).replace(/[^\d]/g, "")}`).join("\n");
      await enviartexto(`*CREADORES DEL BOT*\n\n${fallback}`);
    }
  }
};
