/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { crearContenidoJuego, enviarJuegoHtml, MAX_HTML_BYTES } from "../lib/juego-html.js";
import plugin from "../plugins/fun/snakehtml.js";
import { proto } from "../lib/baileys.js";

function leerRespuesta(contenido) {
  const rich = contenido.botForwardedMessage.message.richResponseMessage;
  const data = rich.unifiedResponse.data;
  return JSON.parse((typeof data === "string" ? Buffer.from(data, "base64") : Buffer.from(data)).toString("utf8"));
}

export const pruebas = [
  ["el sobre HTML lleva un identificador nuevo y sin claves fijas de grupo", () => {
    const a = crearContenidoJuego("<p>prueba</p>");
    const b = crearContenidoJuego("<p>prueba</p>");
    const payload = leerRespuesta(proto.Message.fromObject(a));
    assert.equal(payload.sections[0].view_model.primitive.payload, "<p>prueba</p>");
    assert.deepEqual(payload.sections[0].view_model.primitive.trusted_sources, []);
    assert.equal(payload.response_id, a.messageContextInfo.botMetadata.botResponseId);
    assert.notEqual(payload.response_id, leerRespuesta(proto.Message.fromObject(b)).response_id);
    assert.equal(a.senderKeyDistributionMessage, undefined);
  }],
  ["el transporte rechaza HTML vacío y excesivo", () => {
    assert.throws(() => crearContenidoJuego(""), /vacío/);
    assert.throws(() => crearContenidoJuego("x".repeat(MAX_HTML_BYTES + 1)), /límite/);
  }],
  ["el proto del cliente activo conserva el contenido y metadatos", () => {
    const original = proto.Message.fromObject(crearContenidoJuego("<p>hola</p>"));
    const decoded = proto.Message.decode(proto.Message.encode(original).finish());
    assert.equal(leerRespuesta(decoded).sections[0].view_model.primitive.payload, "<p>hola</p>");
    assert.equal(decoded.messageContextInfo.messageSecret.length, 32);
  }],
  ["snake hace un único relay al chat pedido con el id generado", async () => {
    const llamadas = [];
    const sock = { user: { id: "15550000000@s.whatsapp.net" }, relayMessage: async (...v) => llamadas.push(v) };
    await plugin.execute({ sock, from: "123456@g.us" });
    assert.equal(llamadas.length, 1);
    const [jid, contenido, opts] = llamadas[0];
    assert.equal(jid, "123456@g.us");
    assert.ok(opts.messageId);
    assert.match(leerRespuesta(contenido).sections[0].view_model.primitive.payload, /<canvas/);
    assert.equal(contenido.senderKeyDistributionMessage == null, true);
  }],
  ["si falla el relay, propaga el fallo sin enviar duplicados ni documentos", async () => {
    let relays = 0, envios = 0;
    const sock = {
      user: { id: "15550000000@s.whatsapp.net" },
      relayMessage: async () => { relays++; throw new Error("sin conexión"); },
      sendMessage: async () => { envios++; },
    };
    await assert.rejects(() => plugin.execute({ sock, from: "123456@g.us" }), /sin conexión/);
    assert.equal(relays, 1); assert.equal(envios, 0);
    await assert.rejects(() => enviarJuegoHtml({}, "chat", "hola"), /sesión/);
  }],
  ["el HTML inicia solo cuando el jugador toca Jugar", async () => {
    const html = await readFile(new URL("../juegos/snake.html", import.meta.url), "utf8");
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script); assert.doesNotMatch(html, /(?:src|href)=["']https?:/i);
    const listeners = {};
    const elementos = Object.fromEntries(["c", "inicio", "score", "over", "final"].map((id) => [id, {
      style: {}, textContent: "", addEventListener: (tipo, cb) => { listeners[`${id}:${tipo}`] = cb; },
    }]));
    elementos.c.getContext = () => ({ fillRect() {}, set fillStyle(_v) {} });
    let intervalos = 0, tick;
    const document = {
      getElementById: (id) => elementos[id], querySelectorAll: () => [],
      addEventListener: (tipo, cb) => { listeners[`document:${tipo}`] = cb; },
    };
    const math = Object.create(Math); math.random = () => 0;
    vm.runInNewContext(script, { document, Math: math, clearInterval() {}, setInterval(cb) { tick = cb; intervalos++; return 1; } });
    assert.equal(intervalos, 0);
    listeners["document:keydown"]({ key: "ArrowUp", preventDefault() {} });
    listeners["inicio:click"]();
    assert.equal(intervalos, 1);
    assert.equal(elementos.score.textContent, "Puntos: 0");
    for (let i = 0; i < 8; i++) tick();
    assert.match(elementos.final.textContent, /Fin de la partida/);
    assert.equal(elementos.over.style.display, "block");
  }],
];
