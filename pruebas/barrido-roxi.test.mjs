/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { crearRouter } from "../boot/router.js";
import perfil from "../plugins/perfil/perfil.js";

const dbModulo = pathToFileURL(path.join(process.cwd(), "lib", "database.js")).href;
function conBase(fuente, contenido) {
  const tmp = path.join(process.cwd(), "tmp");
  fs.mkdirSync(tmp, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tmp, "base-roxi-"));
  fs.mkdirSync(path.join(dir, "lib"));
  const archivo = path.join(dir, "lib", "database.json");
  if (contenido !== undefined) fs.writeFileSync(archivo, contenido);
  try {
    const resultado = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(dbModulo)});\n${fuente}`], { cwd: dir, encoding: "utf8", timeout: 10000 });
    return { ...resultado, archivo: fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8") : null };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export const pruebas = [
  ["el router procesa todos los mensajes del lote", async () => {
    const recibidos = [];
    const router = crearRouter({
      sock: { sendMessage: async () => ({}) }, config: { prefix: ["."] },
      commands: new Map([["ping", { execute: async ({ args }) => recibidos.push(args[0]) }]]),
      obtenerDb: () => ({ users: {}, chats: {} }), autorReal: (m) => m.key.participant,
      esOwner: () => false, esAdminGrupo: async () => false,
    });
    const mensaje = (n) => ({ key: { remoteJid: "grupo@g.us", participant: `${n}@s.whatsapp.net`, id: String(n) }, message: { conversation: `.ping ${n}` } });
    await router({ type: "notify", messages: [mensaje(1), mensaje(2), mensaje(3)] });
    assert.deepEqual(recibidos, ["1", "2", "3"]);
  }],
  ["autoguardado no reescribe sin cambios después de guardar", () => {
    const r = conBase(`global.loadDatabase(); global.db.data.users.prueba = { coins: 5 }; if (!global.saveDatabase()) process.exit(31); if (global.saveDatabase()) process.exit(32);`);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.archivo).users.prueba.coins, 5);
  }],
  ["una base corrupta no se sustituye por una base vacía", () => {
    const texto = "{ archivo dañado";
    const r = conBase(`let falló = false; try { global.loadDatabase(); } catch { falló = true; } if (!falló) process.exit(41); global.db.data.users.otro = {}; if (global.saveDatabase(true)) process.exit(42);`, texto);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.archivo, texto);
  }],
  ["perfil no falla con experiencia negativa", async () => {
    let enviado;
    await perfil.execute({
      sock: { profilePictureUrl: async () => "https://example.org/a.jpg", sendMessage: async (_jid, msg) => { enviado = msg; } },
      sender: "12345678@s.whatsapp.net", from: "grupo", m: {}, args: [], enviartexto: () => {},
      db: { users: { "12345678@s.whatsapp.net": { nombre: "Prueba", exp: -20, nivel: 1 } } },
      config: { prefix: ["."], footer: "" }, getTargetFromMsg: () => ({ jid: null }),
    });
    assert.match(enviado.caption, /Prueba/);
  }],
];

pruebas.push(
  ["fix no pisa datos que cambiaron después del respaldo", () => {
    const tmp = path.join(process.cwd(), "tmp");
    fs.mkdirSync(tmp, { recursive: true });
    const raiz = fs.mkdtempSync(path.join(tmp, "fix-roxi-"));
    const origen = path.join(raiz, "origen.git");
    const semilla = path.join(raiz, "semilla");
    const trabajo = path.join(raiz, "trabajo");
    const git = (...args) => execFileSync("git", args, { stdio: "pipe" });
    const plugin = pathToFileURL(path.join(process.cwd(), "plugins", "owner", "fix.js")).href;
    try {
      fs.mkdirSync(semilla);
      git("init", "--bare", "--initial-branch=main", origen);
      git("-C", semilla, "init", "-b", "main");
      git("-C", semilla, "config", "user.name", "riokuroxi-svg");
      git("-C", semilla, "config", "user.email", "riokuroxi-svg@example.invalid");
      fs.writeFileSync(path.join(semilla, ".gitignore"), "lib/database.json\ntmp/\n");
      fs.writeFileSync(path.join(semilla, "archivo.txt"), "version original");
      git("-C", semilla, "add", ".");
      git("-C", semilla, "commit", "-m", "prueba");
      git("-C", semilla, "remote", "add", "origin", origen);
      git("-C", semilla, "push", "-u", "origin", "main");
      git("clone", origen, trabajo);
      fs.mkdirSync(path.join(trabajo, "lib"));
      const codigo = `import fs from "node:fs";
const archivo = process.cwd() + "/lib/database.json";
const original = fs.copyFileSync;
fs.copyFileSync = function(origen, destino, ...resto) {
  const resultado = original.call(fs, origen, destino, ...resto);
  if (String(origen) === archivo) fs.writeFileSync(archivo, JSON.stringify({ version: "nueva" }));
  return resultado;
};
global.saveDatabase = () => { fs.writeFileSync(archivo, JSON.stringify({ version: "anterior" })); return true; };
const plugin = (await import(${JSON.stringify(plugin)})).default;
let respuesta = "";
await plugin.execute({ enviartexto: (s) => { respuesta += s; }, db: { chats: {} }, from: "chat", PREFIX: "." });
if (!respuesta.includes("Actualizado")) { console.error(respuesta); process.exit(22); }
if (JSON.parse(fs.readFileSync(archivo)).version !== "nueva") process.exit(23);`;
      const r = spawnSync(process.execPath, ["--input-type=module", "-e", codigo], { cwd: trabajo, encoding: "utf8", timeout: 20000 });
      assert.equal(r.status, 0, r.stderr || r.stdout);
    } finally { fs.rmSync(raiz, { recursive: true, force: true }); }
  }],
);

pruebas.push(
  ["identidades de otros países y LID no reciben permisos de dueño", async () => {
    const { mismoNumero } = await import("../lib/grupo.js");
    const { esDueno } = await import("../boot/arranque.js");
    const { config } = await import("../config.js");
    assert.equal(mismoNumero("5351234567", "5751234567"), false);
    const numero = config.owners[0].number;
    assert.equal(esDueno(`${numero}@lid`, { user: { id: "11111111111@s.whatsapp.net" } }), false);
    assert.equal(esDueno(`${numero}@s.whatsapp.net`, { user: { id: "11111111111@s.whatsapp.net" } }), true);
  }],
);

pruebas.push(
  ["un LID no se selecciona como teléfono cuando existe un PN alternativo", async () => {
    const { autorReal } = await import("../boot/arranque.js");
    const mensaje = { key: { participant: "234567890123456@lid", participantAlt: "5351234567@s.whatsapp.net", remoteJid: "120363123456789000@g.us" } };
    assert.equal(autorReal(mensaje), "5351234567@s.whatsapp.net");
  }],
);

pruebas.push(
  ["si falla crear la base no arranca con datos solo en memoria", () => {
    const r = conBase(`const fs = (await import("node:fs")).default; const original = fs.writeFileSync; fs.writeFileSync = (...a) => { if (String(a[0]).endsWith(".tmp")) throw new Error("disco lleno"); return original(...a); }; let falló = false; try { global.loadDatabase(); } catch { falló = true; } if (!falló || !global.db._bloqueada) process.exit(45);`);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.archivo, null);
  }],
);
