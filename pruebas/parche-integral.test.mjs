/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { crearGestorSubbots } from "../boot/subbots.js";
import { crearSupervisor } from "../scripts/supervisor.mjs";
import { SUB_SESIONES } from "../lib/rutas.js";
import harem from "../plugins/gacha/harem.js";
import iam from "../plugins/ia/iam.js";
import { resolverRuta } from "../plugins/owner/subir.js";
import menu from "../plugins/info/menu.js";
import { crearBratv } from "../plugins/stickers/bratv.js";

export const pruebas = [
  ["suspender un sub-bot conserva credenciales y cierra el socket", async () => {
    const numero = "529991234567";
    const carpeta = path.join(SUB_SESIONES, numero);
    if (fs.existsSync(carpeta)) throw new Error("El directorio de prueba ya existe");
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, "creds.json"), "{}", { mode: 0o600 });
    const gestor = crearGestorSubbots({});
    const ev = new EventEmitter();
    let cerrado = 0, notificado = 0;
    ev.on("connection.update", () => notificado++);
    gestor.activos.set(numero, { ev, ws: { close: () => { cerrado++; ev.emit("connection.update"); } } });
    try {
      assert.equal(await gestor.suspenderSubbots(), 1);
      assert.equal(cerrado, 1);
      assert.equal(notificado, 0);
      assert.equal(gestor.activos.size, 0);
      assert.equal(fs.existsSync(path.join(carpeta, "creds.json")), true);
    } finally { fs.rmSync(carpeta, { recursive: true, force: true }); }
  }],
  ["stopbot explícito sigue eliminando credenciales", async () => {
    const numero = "529991234568";
    const carpeta = path.join(SUB_SESIONES, numero);
    if (fs.existsSync(carpeta)) throw new Error("El directorio de prueba ya existe");
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, "creds.json"), "{}");
    const gestor = crearGestorSubbots({});
    gestor.activos.set(numero, { ev: new EventEmitter(), ws: { close() {} } });
    try {
      assert.equal(await gestor.stopSubbot(numero), true);
      assert.equal(fs.existsSync(carpeta), false);
    } finally { fs.rmSync(carpeta, { recursive: true, force: true }); }
  }],
  ["harem muestra la colección de la persona solicitada", async () => {
    let mensaje;
    const db = { chats: { grupo: { users: { "persona@s.whatsapp.net": { characters: ["abc"] } }, characters: { abc: { name: "Personaje", value: 123 } } } }, users: {} };
    await harem.execute({ db, from: "grupo", sender: "persona@s.whatsapp.net", args: [], m: {}, PREFIX: ".", getTargetFromMsg: () => ({}), enviartexto: () => {}, sock: { sendMessage: async (_jid, contenido) => { mensaje = contenido; } } });
    assert.match(mensaje.text, /Personaje/);
    assert.match(mensaje.text, /123/);
  }],
  ["bratv limita la descarga y envía el sticker generado", async () => {
    const video = Buffer.from("000000186674797069736f6d00000000", "hex");
    let enviado, solicitud;
    const plugin = crearBratv({
      pedir: async (url, opciones) => { solicitud = { url, opciones }; return { estado: 200, buffer: video }; },
      sticker: () => ({ toBuffer: async () => Buffer.from("sticker") }),
    });
    await plugin.execute({ args: ["hola"], from: "grupo", m: {}, config: {}, enviartexto: () => { throw new Error("no debería fallar"); }, sock: { sendMessage: async (_jid, msg) => { enviado = msg; } } });
    assert.equal(new URL(solicitud.url).searchParams.get("text"), "hola");
    assert.equal(solicitud.opciones.max, 5 * 1024 * 1024);
    assert.equal(enviado.sticker.toString(), "sticker");
  }],
  ["bratv rechaza respuestas que no son MP4", async () => {
    let respuesta;
    const plugin = crearBratv({ pedir: async () => ({ estado: 200, buffer: Buffer.from("<html>error</html>") }), sticker: () => { throw new Error("no debe procesar HTML"); } });
    await plugin.execute({ args: ["hola"], from: "grupo", m: {}, config: {}, enviartexto: (t) => { respuesta = t; }, sock: { sendMessage: () => { throw new Error("no debe enviar"); } } });
    assert.match(respuesta, /MP4/);
  }],
];

pruebas.push(
  ["sub-bot se recupera de un corte transitorio sin borrar la sesión", async () => {
    const creados = [];
    const gestor = crearGestorSubbots({
      obtenerPadre: () => ({ sendMessage: async () => ({}) }),
      leerSesion: async () => ({ state: { creds: { registered: true }, keys: {} }, saveCreds: () => {} }),
      obtenerVersion: async () => ({ version: [2, 1, 0] }),
      prepararClaves: (keys) => keys,
      reintentos: { maximo: 3, baseMs: 10, topeMs: 30, estableMs: 1000 },
      crearSocket: () => {
        const sock = { ev: new EventEmitter(), authState: { creds: { registered: true } }, ws: { close() {} } };
        creados.push(sock);
        return sock;
      },
    });
    const numero = "529991234569";
    try {
      await gestor.startSubbot(null, `${numero}@s.whatsapp.net`, "chat", () => {}, "sesion");
      assert.equal(creados.length, 1);
      creados[0].ev.emit("connection.update", { connection: "open" });
      creados[0].ev.emit("connection.update", { connection: "close", lastDisconnect: { error: { output: { statusCode: 408 }, isBoom: true } } });
      await new Promise((r) => setTimeout(r, 70));
      assert.equal(creados.length, 2);
      creados[1].ev.emit("connection.update", { connection: "open" });
      assert.equal(gestor.activos.size, 1);
    } finally { await gestor.suspenderSubbots(); }
  }],
);

pruebas.push(
  ["vigía no confunde reinicio solicitado y salida limpia con caída", async () => {
    const tmp = path.join(process.cwd(), "tmp");
    fs.mkdirSync(tmp, { recursive: true });
    const carpeta = fs.mkdtempSync(path.join(tmp, "vigia-test-"));
    const archivo = path.join(carpeta, "index.js");
    fs.writeFileSync(archivo, `import fs from "node:fs";
const f = "contador.txt"; const n = fs.existsSync(f) ? Number(fs.readFileSync(f)) : 0;
fs.writeFileSync(f, String(n + 1));
process.on("SIGTERM", () => process.exit(0));
if (!n) process.send("restart");
setInterval(() => {}, 1000);`);
    let arranques = 0, caidas = 0, reloj;
    const supervisor = crearSupervisor({
      raiz: carpeta,
      ganchos: {
        arrancado: () => { if (++arranques === 2) setTimeout(() => supervisor.parar(), 100); },
        cayo: () => { caidas++; },
      },
    });
    try {
      const resultado = await Promise.race([
        supervisor.ejecutar(),
        new Promise((_, reject) => { reloj = setTimeout(() => reject(new Error("Plazo del supervisor agotado")), 6000); }),
      ]);
      assert.equal(resultado, "parado");
      assert.equal(arranques, 2);
      assert.equal(caidas, 0);
    } finally {
      clearTimeout(reloj);
      supervisor.parar();
      fs.rmSync(carpeta, { recursive: true, force: true });
    }
  }],
);

pruebas.push(
  ["iam sin clave avisa antes de llamar al servicio o enviar medios", async () => {
    const anterior = process.env.SUNO_API_KEY;
    delete process.env.SUNO_API_KEY;
    let respuesta;
    try {
      await iam.execute({ args: ["prueba"], m: {}, BOT_NAME: "Bot", config: { prefix: ["."] }, enviartexto: (t) => { respuesta = t; }, sock: { sendMessage: () => { throw new Error("No debe llamar al servicio"); } } });
      assert.match(respuesta, /SUNO_API_KEY/);
    } finally {
      if (anterior === undefined) delete process.env.SUNO_API_KEY;
      else process.env.SUNO_API_KEY = anterior;
    }
  }],
);

pruebas.push(
  ["subir bloquea enlaces simbólicos hacia fuera y hacia .git", () => {
    const tmp = path.join(process.cwd(), "tmp");
    fs.mkdirSync(tmp, { recursive: true });
    const raiz = fs.mkdtempSync(path.join(tmp, "subir-test-"));
    try {
      fs.mkdirSync(path.join(raiz, ".git"));
      fs.symlinkSync("/tmp", path.join(raiz, "afuera"));
      fs.symlinkSync(path.join(raiz, ".git"), path.join(raiz, "alias"));
      fs.symlinkSync("no-existe", path.join(raiz, "roto"));
      assert.equal(resolverRuta(raiz, "afuera/archivo").ok, false);
      assert.equal(resolverRuta(raiz, "alias/config").ok, false);
      assert.equal(resolverRuta(raiz, "roto").ok, false);
      assert.equal(resolverRuta(raiz, "nuevo/archivo.txt").ok, true);
    } finally { fs.rmSync(raiz, { recursive: true, force: true }); }
  }],
);

pruebas.push(
  ["help envía texto si falla la imagen", async () => {
    let respuesta;
    await menu.execute({
      sock: { sendMessage: async () => { throw new Error("imagen no disponible"); } },
      sender: "12345678@s.whatsapp.net", from: "grupo", m: {},
      enviartexto: (t) => { respuesta = t; }, BOT_NAME: "Bot", config: {},
      PREFIX: ".", db: { users: {} }, args: ["mascotas"], comando: "help",
    });
    assert.match(respuesta, /Mascotas/);
  }],
);
