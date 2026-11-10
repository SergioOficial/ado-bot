import fs from "fs";
import path from "path";
import { SESION_PRINCIPAL } from "../../lib/rutas.js";
export default {
  command: ["botsesion", "botsession"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto, args, config, PREFIX } = ctx;
    // La carpeta de sesión es la que usa el bot de verdad (lib/rutas.js).
    const file = path.join(SESION_PRINCIPAL, "globalSession.json");
    const load = () => { try { return JSON.parse(fs.readFileSync(file, "utf8")).enabled !== false; } catch { return true; } };
    const save = (v) => { if (!fs.existsSync(SESION_PRINCIPAL)) fs.mkdirSync(SESION_PRINCIPAL, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ enabled: v }, null, 2)); };
    
    const action = args[0]?.toLowerCase();
    if (!action) return enviartexto(`🌐 *Estado:* ${load() ? "🟢 ACTIVA" : "🔴 INACTIVA"}\nUsa: *${PREFIX}botsesion on|off*`);
    if (action === "off") { save(false); return enviartexto("🔴 *Sesión global desactivada.*"); }
    if (action === "on") { save(true); return enviartexto("🟢 *Sesión global activada.*"); }
    return enviartexto(`⚠️ Uso: ${PREFIX}botsesion on|off`);
  }
};
