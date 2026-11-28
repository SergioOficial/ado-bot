/**
 * La decoración estacional global debe permanecer desactivada.
 */
import { strict as assert } from "node:assert";
import { decorarContenidoNavideno, crearSocketNavideno } from "../lib/navidad.js";

export const pruebas = [
  ["no modifica textos, captions ni logs", () => {
    const original = { text: "🐛 Últimos logs de la consola", caption: "Estado del bot" };
    assert.equal(decorarContenidoNavideno(original), original);
    assert.equal(original.text, "🐛 Últimos logs de la consola");
    assert.equal(original.caption, "Estado del bot");
  }],
  ["no añade felicitaciones a respuestas de comandos", () => {
    const respuestas = [
      { text: "Balance: ¥1,000" },
      { text: "Descarga completada" },
      { text: "Error al ejecutar el comando" },
      { text: "Logs de la consola" },
    ];
    for (const respuesta of respuestas) {
      assert.equal(decorarContenidoNavideno(respuesta), respuesta);
      assert.doesNotMatch(respuesta.text, /NAVIDAD|Feliz Navidad|magia de la Navidad|❄️/i);
    }
  }],
  ["el socket se devuelve sin interceptar envíos", () => {
    const sock = { sendMessage() { return "ok"; } };
    assert.equal(crearSocketNavideno(sock), sock);
  }],
];
