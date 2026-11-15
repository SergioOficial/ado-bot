/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/router.test.mjs — el router, probado sin abrir WhatsApp.
 *
 * Esta es la prueba que faltaba cuando todo vivía en `index.js`: no había forma
 * de llamar al manejador sin una sesión real. Ahora se le pasa un socket falso y
 * unos plugins falsos, y se mide lo que de verdad importa:
 *
 *   · un plugin que revienta NO se lleva el proceso ni el mensaje siguiente;
 *   · lo propio (`fromMe`) y lo que no es comando no llegan al plugin;
 *   · los permisos y el bot primario se respetan;
 *   · con basura por entrada, el manejador resuelve en vez de rechazar.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { crearRouter, numeroDe } from "../boot/router.js";
import { crearGuardaBucles } from "../lib/bucles.js";

const CONFIG = { prefix: [".", "#", "/"], botName: "BotDePrueba" };
const DUEÑO = "5358090650";
const OTRO = "5215512345678";

/** Socket falso: apunta todo lo que le piden mandar. */
function socketFalso({ usuario = `${DUEÑO}:1@s.whatsapp.net`, fallaAlBorrar = false } = {}) {
  const enviados = [];
  return {
    enviados,
    user: { id: usuario },
    sendMessage: async (jid, contenido, opciones) => {
      enviados.push({ jid, contenido, opciones });
      return { key: { remoteJid: jid, id: `OUT${enviados.length}`, fromMe: true } };
    },
    ws: {},
    _fallaAlBorrar: fallaAlBorrar,
  };
}

/** Un mensaje entrante con la forma que entrega Baileys. */
function entrante(texto, { jid = "120363@g.us", autor = `${OTRO}@s.whatsapp.net`, fromMe = false, id = "IN1" } = {}) {
  return {
    type: "notify",
    messages: [
      {
        key: { remoteJid: jid, fromMe, id, participant: autor },
        message: { conversation: texto },
      },
    ],
  };
}

/** Plugins falsos con un registro de llamadas. */
function pluginsFalsos() {
  const llamadas = [];
  const comandos = new Map([
    ["menu", { command: "menu", execute: async (ctx) => { llamadas.push({ c: "menu", ctx }); } }],
    ["kick", { command: "kick", isAdmin: true, execute: async (ctx) => { llamadas.push({ c: "kick", ctx }); } }],
    ["exec", { command: "exec", isOwner: true, execute: async (ctx) => { llamadas.push({ c: "exec", ctx }); } }],
    ["bot", { command: "bot", execute: async (ctx) => { llamadas.push({ c: "bot", ctx }); } }],
    ["setprimary", { command: "setprimary", execute: async (ctx) => { llamadas.push({ c: "setprimary", ctx }); } }],
    ["rompe", { command: "rompe", execute: async () => { throw new Error("el plugin reventó a propósito"); } }],
    ["lento", { command: "lento", execute: async (ctx) => { llamadas.push({ c: "lento", ctx }); } }],
  ]);
  return { comandos, llamadas };
}

function baseFalsa() {
  return { users: {}, chats: {}, settings: {} };
}

/** Arma un router con todo falso y devuelve las piezas para inspeccionar. */
function taller({ db = baseFalsa(), admin = true, dueño = DUEÑO, guardaAjustes, ...resto } = {}) {
  const sock = socketFalso(resto);
  const { comandos, llamadas } = pluginsFalsos();
  const guarda = crearGuardaBucles(guardaAjustes);
  const atender = crearRouter({
    sock,
    commands: comandos,
    config: CONFIG,
    obtenerDb: () => db,
    esOwner: (jid) => numeroDe(jid) === dueño,
    esAdminGrupo: async () => admin,
    autorReal: (m) => m.key?.participant || m.key?.remoteJid,
    guarda: () => guarda,
    enviar: (jid, contenido, opciones) => sock.sendMessage(jid, contenido, opciones),
    urgentes: new Set(["menu"]),
    extras: { jidToNumber: numeroDe },
  });
  return { sock, llamadas, db, guarda, atender };
}

export const pruebas = [
  ["un comando llega al plugin con el contexto armado", async () => {
    const { llamadas, atender } = taller();
    await atender(entrante(".menu rpg"));
    igual(llamadas.length, 1, "una sola llamada");
    igual(llamadas[0].c, "menu", "el comando");
    const ctx = llamadas[0].ctx;
    igual(ctx.comando, "menu", "ctx.comando");
    igual(ctx.args, ["rpg"], "ctx.args");
    igual(ctx.isGroup, true, "ctx.isGroup");
    igual(ctx.PREFIX, ".", "ctx.PREFIX");
    igual(ctx.BOT_NAME, "BotDePrueba", "ctx.BOT_NAME");
    esVerdad(typeof ctx.enviartexto === "function", "ctx.enviartexto");
    esVerdad(ctx.db && typeof ctx.db === "object", "ctx.db");
    igual(ctx.jidToNumber("5215512345678:9@s.whatsapp.net"), "5215512345678", "los extras pasan");
  }],

  ["cada prefijo funciona", async () => {
    const { llamadas, atender } = taller();
    // Autores distintos a propósito: con el mismo autor y el mismo comando la
    // guarda anti-eco cortaría el segundo, que es justo lo que debe hacer.
    await atender(entrante("#menu", { autor: "5215500000001@s.whatsapp.net" }));
    await atender(entrante("/menu", { autor: "5215500000002@s.whatsapp.net", id: "IN2" }));
    await atender(entrante(".menu", { autor: "5215500000003@s.whatsapp.net", id: "IN3" }));
    igual(llamadas.length, 3, "los tres atendidos");
    igual(llamadas[0].ctx.PREFIX, "#", "prefijo numeral");
    igual(llamadas[1].ctx.PREFIX, "/", "prefijo barra");
    igual(llamadas[2].ctx.PREFIX, ".", "prefijo punto");
  }],

  ["lo que no es comando no llega al plugin", async () => {
    const { llamadas, sock, atender } = taller();
    await atender(entrante("hola a todos"));
    await atender(entrante("."));
    await atender(entrante(".desconocido", { id: "IN3" }));
    igual(llamadas.length, 0, "ningún plugin llamado");
    igual(sock.enviados.length, 0, "y no se contesta nada");
  }],

  ["un mensaje propio (fromMe) se descarta", async () => {
    const { llamadas, atender } = taller();
    await atender(entrante(".menu", { fromMe: true }));
    igual(llamadas.length, 0, "el bot no se hace caso a sí mismo");
  }],

  ["un plugin que revienta no se lleva el proceso ni el mensaje siguiente", async () => {
    const { sock, llamadas, atender } = taller();
    // Si esto rechazara, en el bot real sería un rechazo no manejado: proceso fuera.
    await atender(entrante(".rompe"));
    await atender(entrante(".lento", { id: "IN4" }));
    igual(llamadas.length, 1, "el siguiente mensaje sí se atendió");
    igual(llamadas[0].c, "lento", "y era el correcto");
    const aviso = sock.enviados.find((e) => String(e.contenido?.text || "").includes("Error en *rompe*"));
    esVerdad(aviso, "se le avisó al usuario del fallo");
  }],

  ["sin base de datos no se atiende (mejor que escribir a medias)", async () => {
    const { llamadas, atender } = taller({ db: null });
    await atender(entrante(".menu"));
    igual(llamadas.length, 0, "no se llamó al plugin");
  }],

  ["un comando de dueño no lo ejecuta cualquiera", async () => {
    const { llamadas, sock, atender } = taller();
    await atender(entrante(".exec"));
    igual(llamadas.length, 0, "no se ejecuta");
    esVerdad(sock.enviados.some((e) => String(e.contenido?.text || "").includes("exclusivo de los Owners")), "se explica");

    await atender(entrante(".exec", { autor: `${DUEÑO}@s.whatsapp.net`, id: "IN5" }));
    igual(llamadas.length, 1, "el dueño sí");
  }],

  ["un comando de administrador pide grupo y permiso", async () => {
    const t1 = taller();
    await t1.atender(entrante(".kick", { jid: `${OTRO}@s.whatsapp.net` }));
    igual(t1.llamadas.length, 0, "en privado no");
    esVerdad(t1.sock.enviados.some((e) => String(e.contenido?.text || "").includes("solo funciona en grupos")), "se explica");

    const t2 = taller({ admin: false });
    await t2.atender(entrante(".kick"));
    igual(t2.llamadas.length, 0, "sin permiso de admin no");

    const t3 = taller({ admin: true });
    await t3.atender(entrante(".kick"));
    igual(t3.llamadas.length, 1, "con permiso sí");
  }],

  ["con el bot apagado solo pasa el interruptor", async () => {
    const db = baseFalsa();
    db.chats["120363@g.us"] = { botApagado: true };
    const { llamadas, atender } = taller({ db });
    await atender(entrante(".menu"));
    igual(llamadas.length, 0, "menu bloqueado");
    await atender(entrante(".bot", { id: "IN6" }));
    igual(llamadas.length, 1, "el interruptor sí pasa");
  }],

  ["si el grupo tiene bot primario, los demás se callan", async () => {
    const db = baseFalsa();
    db.chats["120363@g.us"] = { primaryBot: `${OTRO}@s.whatsapp.net` };

    // Este socket es el DUEÑO, así que no es el primario: se calla.
    const t1 = taller({ db });
    await t1.atender(entrante(".menu"));
    igual(t1.llamadas.length, 0, "no es el primario");

    // `setprimary` queda fuera de la regla para poder cambiarlo.
    await t1.atender(entrante(".setprimary", { id: "IN7" }));
    igual(t1.llamadas.length, 1, "setprimary sí pasa");

    // Un socket que SÍ es el primario atiende.
    const t2 = taller({ db, dueño: DUEÑO });
    t2.db.chats["120363@g.us"].primaryBot = `${DUEÑO}@s.whatsapp.net`;
    await t2.atender(entrante(".menu", { id: "IN8" }));
    igual(t2.llamadas.length, 1, "el primario atiende");
  }],

  ["el sufijo «-» manda la respuesta en privado", async () => {
    const { sock, llamadas, atender } = taller();
    await atender(entrante(".menu-", { autor: `${OTRO}@s.whatsapp.net` }));
    igual(llamadas.length, 1, "se ejecuta");
    igual(llamadas[0].ctx.from, `${OTRO}@s.whatsapp.net`, "el destino es quien lo pidió");
    esVerdad(sock.enviados.some((e) => e.contenido?.delete), "en grupo se borra el pedido");
  }],

  ["el eco calcado se corta antes del plugin", async () => {
    const { llamadas, atender } = taller();
    await atender(entrante(".menu", { id: "A1" }));
    await atender(entrante(".menu", { id: "A2" }));
    igual(llamadas.length, 1, "la repetición inmediata no llega");

    // Pasada la ventana vuelve a atender. Se usa una ventana corta en vez de
    // dormir 1,3 s: la prueba no puede depender de cuánto tarde la máquina.
    const { llamadas: despues, atender: atender2 } = taller({ guardaAjustes: { ventanaMs: 30 } });
    await atender2(entrante(".menu", { id: "B1" }));
    await new Promise((r) => setTimeout(r, 60));
    await atender2(entrante(".menu", { id: "B2" }));
    igual(despues.length, 2, "fuera de la ventana sí");
  }],

  ["dos personas pidiendo lo mismo a la vez no se estorban", async () => {
    const { llamadas, atender } = taller();
    await atender(entrante(".menu", { autor: "5215511111111@s.whatsapp.net", id: "C1" }));
    await atender(entrante(".menu", { autor: "5215522222222@s.whatsapp.net", id: "C2" }));
    igual(llamadas.length, 2, "la huella incluye al autor");
  }],

  ["eventos sin forma no rechazan", async () => {
    const { atender } = taller();
    const raros = [
      undefined, null, {}, { type: "notify" }, { type: "notify", messages: [] },
      { type: "notify", messages: [null] }, { type: "notify", messages: [{}] },
      { type: "notify", messages: [{ key: null, message: null }] },
      { type: "append" },
    ];
    for (const raro of raros) {
      // Que resuelva: si rechazara, en el bot real sería proceso fuera.
      await atender(raro);
    }
    esVerdad(true, "ninguno hizo reventar nada");
  }],

  ["numeroDe quita dispositivo y dominio", () => {
    igual(numeroDe("5215512345678:12@s.whatsapp.net"), "5215512345678", "con dispositivo");
    igual(numeroDe("120363000@g.us"), "120363000", "grupo");
    igual(numeroDe(null), "", "nulo");
    igual(numeroDe(undefined), "", "indefinido");
  }],
];
