import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "database", "nsfw.json");

// Asegura que exista el archivo
function leerDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({}), "utf8");
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function guardarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export default {
  command: ["nsfw"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;

    // 📌 Solo en grupos
    if (!from.endsWith("@g.us")) {
      return enviartexto("❌ Este comando solo funciona en grupos.");
    }

    // 📌 Solo administradores
    const groupMetadata = await sock.groupMetadata(from);
    const participant = groupMetadata.participants.find(
      (p) => p.id === m.sender
    );
    if (!participant?.admin) {
      return enviartexto("❌ Solo los administradores pueden cambiar el modo NSFW.");
    }

    // 📌 Leer argumento (on/off)
    const texto = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
    const args = texto.trim().split(/\s+/).slice(1); // ["on"] o ["off"]
    const accion = args[0]?.toLowerCase();

    if (!["on", "off"].includes(accion)) {
      return enviartexto("⚠️ Uso: `nsfw on` para activar o `nsfw off` para desactivar.");
    }

    // 📌 Guardar estado
    const db = leerDB();
    db[from] = accion === "on";
    guardarDB(db);

    await enviartexto(
      accion === "on"
        ? "✅ Modo NSFW **activado** en este grupo."
        : "🚫 Modo NSFW **desactivado** en este grupo."
    );

    await sock.sendMessage(from, {
      react: { text: accion === "on" ? "🔞" : "🔒", key: m.key },
    });
  },
};