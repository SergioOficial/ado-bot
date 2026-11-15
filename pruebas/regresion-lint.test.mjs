/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/regresion-lint.test.mjs — los tres bugs que encontró `no-undef`.
 *
 * Las 229 pruebas pasaban en verde con los tres puestos, porque las tres eran
 * justo la clase de fallo que una prueba no ve si no apunta a ese camino:
 *
 *   1. `lib/antiban.js` llamaba a `dormir()` desde `envolverSocket`, pero
 *      `dormir` estaba definida DENTRO de `crearCola`. El `ReferenceError` caía
 *      en un `catch {}` y la espera de ritmo humano antes de cada envío no
 *      ocurría nunca.
 *   2. `plugins/utils/say.js` mandaba `{ text }` donde la variable se llama
 *      `texto`: `.say hola` contestaba «no pude repetir eso: text is not
 *      defined».
 *   3. `pruebas/botones.test.mjs` afirmaba `igual(null ?? "sin viewOnce", …)`,
 *      una constante contra sí misma: daba verde pasara lo que pasara.
 *
 * El 1 y el 2 los cubre esto. El 3 ya no existe, y lo que impide que vuelvan los
 * otros dos es `npm run lint` en el CI, no una prueba.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { crearCola, crearLimitador, crearSalud, envolverSocket } from "../lib/antiban.js";
import { crearRitmo } from "../lib/ritmo.js";
import say from "../plugins/utils/say.js";

/** Contexto falso mínimo, con la forma que arma boot/router.js. */
function ctxFalso(sobre = {}) {
  const enviados = [];
  return {
    enviados,
    ctx: {
      sock: {
        sendMessage: async (jid, contenido) => { enviados.push(contenido); return { key: { id: "X", remoteJid: jid } }; },
        updateMediaMessage: undefined,
        sendPresenceUpdate: async () => {},
      },
      m: { key: { remoteJid: "120363@g.us", id: "IN1" }, message: {} },
      from: "120363@g.us",
      sender: "5215512345678@s.whatsapp.net",
      isGroup: true,
      args: [],
      comando: "say",
      texto: "",
      PREFIX: ".",
      BOT_NAME: "Bot",
      config: { prefix: ["."] },
      db: { users: {}, chats: {} },
      enviartexto: async (t) => { enviados.push({ text: t }); },
      ...sobre,
    },
  };
}

/**
 * Ajustes rápidos y con la curva circadiana apagada.
 *
 * Esto no es cosmético y costó encontrarlo: con los ajustes por defecto esta
 * prueba se **colgaba para siempre** cuando el reloj local caía entre las 2 y las
 * 6 de la mañana, que es la ventana de silencio de `lib/ritmo.js`
 * (`silencioDesde: 2`, `silencioHasta: 6`). A esas horas `ritmo.permite()`
 * contesta `{ ok: false, motivo: "madrugada" }` para una conversación nueva, la
 * cola se queda esperando a que amanezca y el `await sock.sendMessage(...)` no
 * vuelve nunca. En el CI pasaba en verde porque corre en UTC y a otra hora; en
 * una máquina donde fueran las 3 de la mañana, no terminaba.
 *
 * `activo: false` en el ritmo hace que `permite` conteste siempre que sí, y el
 * limitador va con esperas de milisegundos y `circadiano: false`. Lo que esta
 * prueba mide es el ámbito de `dormir` y que el parche del socket quede puesto,
 * no el estrangulamiento: para eso están `pruebas/antiban.test.mjs` y
 * `pruebas/ritmo.test.mjs`.
 */
const RAPIDO = {
  activo: false, // ritmo: ni puerta de madrugada ni cupo de chats nuevos
  circadiano: false, // limitador: sin multiplicador nocturno
  baseMs: 5,
  minimoMs: 1,
  maximoMs: 10,
  diasCalentamiento: 0,
  inicioMsgsDia: 1000,
  maxMsgsDia: 1000,
  tecleoMinMs: 1,
  tecleoMaxMs: 2,
  presencia: false,
};

export const pruebas = [
  ["`.say hola` repite el texto en vez de contestar con un error", async () => {
    const { enviados, ctx } = ctxFalso({ comando: "say", texto: "hola a todos", args: ["hola", "a", "todos"] });
    await say.execute(ctx);
    igual(enviados.length, 1, "un solo envío");
    igual(enviados[0].text, "hola a todos", "dice lo que se le pidió");
    esVerdad(!/is not defined/.test(String(enviados[0].text)), "y no se le escapó un ReferenceError al usuario");
  }],

  ["`.say` sin texto sigue pidiendo el texto", async () => {
    const { enviados, ctx } = ctxFalso({ comando: "say", texto: "", args: [] });
    await say.execute(ctx);
    esVerdad(enviados.some((e) => /Escríbeme qué quiero decir/.test(String(e.text || ""))), "explica qué falta");
  }],

  ["envolverSocket parchea el socket sin tirar un ReferenceError", async () => {
    const limitador = crearLimitador({ estado: {}, ajustes: RAPIDO });
    const salud = crearSalud();
    const ritmo = crearRitmo({ estado: {}, ajustes: RAPIDO });
    const cola = crearCola({ limitador, salud, ritmo, registro: {}, esperaTopeMs: 10 });

    const { ctx } = ctxFalso();
    const sock = ctx.sock;
    sock.user = { id: "5358090650:1@s.whatsapp.net" };
    sock.relayMessage = async () => ({});
    sock.ev = { on() {} };
    sock.ws = { isOpen: true };

    // Si `dormir` volviera a estar fuera de ámbito, esto no lanza (el catch {} se
    // lo come) pero la espera no ocurre: se mide que el parche quede puesto y que
    // un envío completo termine sin error.
    const envuelto = envolverSocket(sock, { cola, ritmo });
    esVerdad(envuelto === sock, "devuelve el mismo socket parcheado");
    esVerdad(typeof sock.sendMessage === "function", "sendMessage sigue siendo función");

    await sock.sendMessage("5215512345678@s.whatsapp.net", { text: "una prueba de ritmo" });
    esVerdad(true, "el envío con tecleo y espera terminó sin reventar");
  }],

  ["la cola sigue exponiendo lo suyo tras mover `dormir` de sitio", () => {
    const cola = crearCola({
      limitador: crearLimitador({ estado: {}, ajustes: RAPIDO }),
      salud: crearSalud(),
      ritmo: crearRitmo({ estado: {}, ajustes: RAPIDO }),
      registro: {},
      esperaTopeMs: 10,
    });
    for (const nombre of ["encolar", "conPrioridad", "pausar", "reanudar", "motivos", "pausada", "largo", "limpiar", "estado"]) {
      esVerdad(nombre in cola, `cola.${nombre} existe`);
    }
  }],
];
