#!/usr/bin/env node
/**
 * Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE
 *
 * scripts/humo.mjs — prueba de humo: llama a TODOS los plugins con un contexto
 * falso y se queda con los que revientan. Pilla lo que `node --check` no ve:
 * variables mal escritas, `ctx` incompleto, funciones que no existen.
 *
 * OJO: algunos comandos tocan el disco o reinician el bot (`.fix` llegó a hacer
 * `git reset --hard`). Esos NO se llaman nunca, ni con `--red`: están en NUNCA.
 *
 * Uso:  node scripts/humo.mjs          (salta los que necesitan red o medios)
 *       node scripts/humo.mjs --red    (incluye también esos)
 */
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { objetivo, numeroDe } from "../lib/grupo.js";

const RAIZ = process.cwd();
const CON_RED = process.argv.includes("--red");

if (!existsSync(join(RAIZ, "node_modules"))) {
  console.log("Falta node_modules. Ejecuta primero: npm install");
  process.exit(1);
}

/**
 * Los que jamás se llaman desde aquí: borran archivos, reinician el proceso o
 * hacen `git reset`. Un contexto falso no basta para que sean inocuos.
 */
const NUNCA = new Set([
  "fix", "clear", "restart", "reload", "exec", "backup", "nuevo", "delplugin",
  "botsesion", "broadcast", "join", "leave", "invite",
]);

/**
 * Con un contexto falso no pueden funcionar: piden red, medios o una API.
 * La lista está a la vista para que no se vuelva un cajón donde esconder fallos.
 */
const NECESITAN_MUNDO = new Set([
  "ia", "iaaudio", "imagen", "play", "play2", "ytmp3", "ytmp4", "audio", "video",
  "fb", "ig", "tiktok", "twitter", "spotify", "pinterest", "mediafire", "apk",
  "crypto", "letra", "tourl", "acortar", "sticker", "sticker2", "toimg", "ttp",
  "get", "pfp", "wastalk", "qr", "morse", "say", "tts", "gacha", "waifu",
  "setgpbanner", "pin", "unpin", "link", "revoke", "setgpname", "setgpdesc",
  "block", "unblock", "blocklist", "promote", "kick", "warn", "afk",
]);

function contextoFalso(comando) {
  const db = {
    users: { "5210000000001@s.whatsapp.net": { coins: 5000, bank: 0, exp: 10, nivel: 2 } },
    chats: {},
    settings: {},
    saveDatabase() {},
  };
  global.db = { data: db };

  const sock = {
    user: { id: "5210000000000:1@s.whatsapp.net", lid: "1234@lid" },
    sendMessage: async () => ({ key: { id: "x" } }),
    groupMetadata: async () => ({
      id: "120363000000000000@g.us",
      subject: "Grupo de prueba",
      participants: [{ id: "5210000000001@s.whatsapp.net", admin: "admin" }],
    }),
    fetchBlocklist: async () => [],
    updateBlockStatus: async () => {},
    chatModify: async () => {},
    groupInviteCode: async () => "https://chat.whatsapp.com/ABC",
    groupRevokeInvite: async () => "https://chat.whatsapp.com/NUEVO",
    groupUpdateSubject: async () => {},
    groupUpdateDescription: async () => {},
    updateProfilePicture: async () => {},
    updateProfileName: async () => {},
    profilePictureUrl: async () => "https://ejemplo.com/foto.jpg",
    relayMessage: async () => "id-falso",
    ev: { on() {}, off() {}, emit() {} },
    ws: { isOpen: true },
  };

  const enviados = [];
  return {
    sock,
    m: {
      key: { remoteJid: "120363000000000000@g.us", participant: "5210000000001@s.whatsapp.net" },
      message: {},
    },
    from: "120363000000000000@g.us",
    sender: "5210000000001@s.whatsapp.net",
    isGroup: true,
    args: [],
    comando,
    texto: "",
    PREFIX: ".",
    BOT_NAME: "Levi-Bot",
    config: {
      version: "1.0.0",
      prefix: [".", "/"],
      owners: ["5210000000000"],
      footer: "Levi-Bot",
      ownerName: "Dueño",
    },
    db,
    enviartexto: async (t) => enviados.push(t),
    enviados,
    // Los mismos ayudantes que arma index.js en el ctx real.
    // En index.js la firma es (mensaje, args) y devuelve { jid }.
    getTargetFromMsg: (mm, lista) => ({ jid: objetivo({ m: mm, args: lista }) }),
    jidToNumber: numeroDe,
    isOwnerCheck: () => true,
    loadSubConfig: () => ({ owners: [] }),
    saveSubConfig: () => {},
    startSubbot: async () => {},
    stopSubbot: async () => false,
    getActiveSubbots: () => [],
  };
}

const fallos = [];
const saltados = [];
const peligrosos = [];
let probados = 0;

for (const carpeta of readdirSync(join(RAIZ, "plugins"))) {
  for (const archivo of readdirSync(join(RAIZ, "plugins", carpeta)).filter((f) => f.endsWith(".js"))) {
    const nombre = archivo.replace(/\.js$/, "");

    if (NUNCA.has(nombre)) {
      peligrosos.push(`${carpeta}/${nombre}`);
      continue;
    }
    if (!CON_RED && NECESITAN_MUNDO.has(nombre)) {
      saltados.push(nombre);
      continue;
    }

    try {
      const { default: plugin } = await import(`../plugins/${carpeta}/${archivo}`);
      if (typeof plugin?.execute !== "function") continue;
      const comandos = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      probados++;
      await plugin.execute(contextoFalso(comandos[0]));
    } catch (err) {
      fallos.push({
        plugin: `${carpeta}/${nombre}.js`,
        error: err.message,
        traza: (err.stack || "").split("\n")[1]?.trim(),
      });
    }
  }
}

console.log(
  `\n🧪 Prueba de humo: ${probados} plugins llamados · ${saltados.length} saltados${
    CON_RED ? "" : " (necesitan red o medios)"
  }`
);
if (saltados.length) console.log(`   Saltados: ${saltados.join(", ")}`);
if (peligrosos.length) console.log(`   No se llaman nunca (tocan disco o reinician): ${peligrosos.join(", ")}`);

if (!fallos.length) {
  console.log("\n✅ Ninguno revienta con un contexto falso.\n");
  process.exit(0);
}

console.log(`\n❌ ${fallos.length} revientan:\n`);
for (const f of fallos) console.log(`  · ${f.plugin}\n    ${f.error}\n    ${f.traza || ""}`);
console.log("");
process.exit(1);
