/**
 * Pruebas de la decoración navideña, sin conexión real a WhatsApp.
 */
import { strict as assert } from "node:assert";
import { decorarContenidoNavideno, crearSocketNavideno } from "../lib/navidad.js";

export const pruebas = [
  ["decora texto y caption sin alterar otros campos", () => {
    const original = { text: "Hola", mentions: ["123@s.whatsapp.net"] };
    const salida = decorarContenidoNavideno(original);
    assert.notEqual(salida, original);
    assert.match(salida.text, /🎄/);
    assert.match(salida.text, /Hola/);
    assert.match(salida.text, /❄️/);
    assert.deepEqual(salida.mentions, original.mentions);

    const imagen = decorarContenidoNavideno({ image: { url: "https://example.com/a.jpg" }, caption: "Foto" });
    assert.match(imagen.caption, /🎄/);
  }],
  ["no duplica la decoración", () => {
    const una = decorarContenidoNavideno({ text: "Hola" });
    assert.equal(decorarContenidoNavideno(una), una);
  }],
  ["no modifica reacciones, borrados ni multimedia sin texto", () => {
    const reaccion = { react: { text: "✅" } };
    const borrado = { delete: { id: "x" } };
    const sticker = { sticker: Buffer.from("x") };
    assert.equal(decorarContenidoNavideno(reaccion), reaccion);
    assert.equal(decorarContenidoNavideno(borrado), borrado);
    assert.equal(decorarContenidoNavideno(sticker), sticker);
  }],
  ["el socket proxy conserva this y decora sendMessage", async () => {
    const llamadas = [];
    const sock = {
      marca: "socket",
      async sendMessage(jid, contenido, opciones) {
        assert.equal(this.marca, "socket");
        llamadas.push({ jid, contenido, opciones });
        return "ok";
      },
      otroMetodo() { return this.marca; },
    };
    const proxy = crearSocketNavideno(sock, (jid, contenido, opciones) =>
      sock.sendMessage(jid, decorarContenidoNavideno(contenido), opciones)
    );
    assert.equal(await proxy.sendMessage("chat", { text: "Hola" }), "ok");
    assert.match(llamadas[0].contenido.text, /🎄/);
    assert.equal(proxy.otroMetodo(), "socket");
  }],
];
