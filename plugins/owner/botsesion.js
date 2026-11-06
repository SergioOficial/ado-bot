import fs from "fs";
export default {
  command: ["botsesion", "botsession"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto, args, config, PREFIX } = ctx;
    const file = "./Sessions/globalSession.json";
    const load = () => { try { return JSON.parse(fs.readFileSync(file, "utf8")).enabled !== false; } catch { return true; } };
    const save = (v) => { if (!fs.existsSync("./Sessions")) fs.mkdirSync("./Sessions", { recursive: true }); fs.writeFileSync(file, JSON.stringify({ enabled: v }, null, 2)); };
    
    const action = args[0]?.toLowerCase();
    if (!action) return enviartexto(`🌐 *Estado:* ${load() ? "🟢 ACTIVA" : "🔴 INACTIVA"}\nUsa: *${PREFIX}botsesion on|off*`);
    if (action === "off") { save(false); return enviartexto("🔴 *Sesión global desactivada.*"); }
    if (action === "on") { save(true); return enviartexto("🟢 *Sesión global activada.*"); }
    return enviartexto(`⚠️ Uso: ${PREFIX}botsesion on|off`);
  }
};
