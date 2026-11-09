import fs from "fs";

// 📁 Crear carpeta temporal si no existe
if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp", { recursive: true });
const logFile = "./tmp/console.log";

// 🕵️‍♂️ Interceptar la consola (Solo se ejecuta una vez)
if (!global.__consoleHooked) {
  global.__consoleHooked = true;

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const writeLog = (type, args) => {
    try {
      const text = args.map(a => {
        if (typeof a === "object") {
          try { return JSON.stringify(a); } catch { return "[Objeto]"; }
        }
        return String(a);
      }).join(" ");
      
      const time = new Date().toLocaleTimeString("es-PE", { timeZone: "America/Lima" });
      fs.appendFileSync(logFile, `[${time}] [${type}] ${text}\n`);
    } catch (e) {
      // Evitar que un error al escribir log rompa el bot
    }
  };

  console.log = (...args) => { writeLog("LOG", args); originalLog(...args); };
  console.error = (...args) => { writeLog("ERROR", args); originalError(...args); };
  console.warn = (...args) => { writeLog("WARN", args); originalWarn(...args); };
}

export default {
  command: ["error", "errors", "logs", "consola"],
  isOwner: true, // Solo los owners pueden ver los errores
  execute: async (ctx) => {
    const { enviartexto, args, sock, from, m } = ctx;
    const action = args[0]?.toLowerCase();

    // 🧹 Limpiar los logs
    if (action === "clear" || action === "limpiar") {
      fs.writeFileSync(logFile, "");
      return enviartexto("🧹 *Logs de la consola borrados con éxito.*");
    }

    // 📄 Leer y enviar los logs
    if (!fs.existsSync(logFile)) {
      return enviartexto("⚠️ No hay logs registrados todavía.");
    }

    let logs = fs.readFileSync(logFile, "utf8");

    if (!logs.trim()) {
      return enviartexto("⚠️ El archivo de logs está vacío.");
    }

    // ✂️ Recortar si es muy largo (límite de WhatsApp ~4000 caracteres)
    if (logs.length > 3500) {
      logs = "... (recortado por longitud)\n" + logs.slice(-3500);
    }

    const texto = `🐛 *ÚLTIMOS LOGS DE LA CONSOLA*\n\n\`\`\`\n${logs}\n\`\`\`\n\n> Usa *${ctx.PREFIX}error clear* para limpiar.`;

    await sock.sendMessage(from, { text: texto }, { quoted: m });
  }
};