/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * La sonda de formatos: que mande las ocho variantes y que el veredicto diga
 * lo que toca. Sin abrir WhatsApp: socket de mentira.
 */
import fs from "node:fs";
import path from "node:path";
import sonda from "../plugins/owner/sonda.js";
import { igual, esVerdad } from "./ayuda.mjs";

const ARCHIVO = path.join(process.cwd(), "data", "sonda.json");
const JID = "5215512345678@s.whatsapp.net";

function socketFalso(registro) {
  return {
    user: { id: "5215512345678:1@s.whatsapp.net" },
    async sendMessage(_jid, contenido) {
      registro.push(Object.keys(contenido).filter((k) => contenido[k] !== undefined).join("+"));
      return { key: { id: "X" } };
    },
    async relayMessage(_jid, mensaje) {
      registro.push(Object.keys(mensaje).filter((k) => mensaje[k]).join("+"));
      return {};
    },
  };
}

const contexto = (sock) => {
  const dicho = { texto: "" };
  return {
    sock,
    dicho,
    ctx: {
      sock,
      from: JID,
      m: { key: { id: "ABC", remoteJid: JID }, message: { conversation: "x" } },
      args: [],
      enviartexto: async (t) => {
        dicho.texto = t;
      },
    },
  };
};

async function conSonda(datos, fn) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(datos));
  try {
    await fn();
  } finally {
    fs.rmSync(ARCHIVO, { force: true });
  }
}

export const pruebas = [
  ["la sonda manda ocho variantes, cada una con su envoltorio", async () => {
    const registro = [];
    await conSonda({}, async () => {
      const { ctx } = contexto(socketFalso(registro));
      await sonda.execute(ctx);
    });

    igual(registro.length, 8, "ocho mensajes");
    igual(registro[0], "text", "1: texto plano");
    igual(registro[1], "messageContextInfo+interactiveMessage", "2: tarjeta mínima");
    igual(registro[5], "text+footer+buttons", "6: botones clásicos");
    igual(registro[6], "templateMessage+messageContextInfo", "7: plantilla");
    igual(registro[7], "text+title+buttonText+sections", "8: lista");
  }],

  ["la sonda no responde en grupos ni a quien no es el dueño", async () => {
    await conSonda({}, async () => {
      const registro = [];
      const { ctx, dicho } = contexto(socketFalso(registro));
      await sonda.execute({ ...ctx, from: "120363000@g.us" });
      igual(registro.length, 0, "no manda nada en grupo");
      esVerdad(dicho.texto.includes("privado"), "lo dice por privado");
    });
  }],

  ["el veredicto con todo pintado: no hay nada que cambiar", async () => {
    await conSonda({ enviado: { texto: "x", "moderno-completo": "x" }, pintado: { texto: "texto", "moderno-completo": "nativa" } }, async () => {
      const { ctx, dicho } = contexto(socketFalso([]));
      await sonda.execute({ ...ctx, args: ["fin"] });
      esVerdad(dicho.texto.includes("no cambies de formato"), "dice que el cartel viene de otra parte");
    });
  }],

  ["el veredicto con solo clásico pintado manda usar el formato clásico", async () => {
    await conSonda({ enviado: { texto: "x", clasico: "x" }, pintado: { texto: "texto", clasico: "clasico" } }, async () => {
      const { ctx, dicho } = contexto(socketFalso([]));
      await sonda.execute({ ...ctx, args: ["fin"] });
      esVerdad(dicho.texto.includes("BOTONES_FORMATO=clasico"), "aconseja el clásico");
    });
  }],

  ["el veredicto con solo la mínima pintada avisa de que el adorno es el culpable", async () => {
    await conSonda({ enviado: { texto: "x", "moderno-minimo": "x" }, pintado: { texto: "texto", "moderno-minimo": "nativa" } }, async () => {
      const { ctx, dicho } = contexto(socketFalso([]));
      await sonda.execute({ ...ctx, args: ["fin"] });
      esVerdad(dicho.texto.includes("adorno"), "habla del adorno");
      esVerdad(dicho.texto.includes("cita"), "nombra la cita como sospechosa");
    });
  }],

  ["el veredicto sin datos no inventa: pide medir", async () => {
    await conSonda({}, async () => {
      const { ctx, dicho } = contexto(socketFalso([]));
      await sonda.execute({ ...ctx, args: ["fin"] });
      esVerdad(dicho.texto.includes("No hay datos"), "pide hacer la sonda");
    });
  }],

  ["si ni el texto se pinta, el problema no es el formato", async () => {
    await conSonda({ enviado: { texto: "x" }, pintado: {} }, async () => {
      const { ctx, dicho } = contexto(socketFalso([]));
      await sonda.execute({ ...ctx, args: ["fin"] });
      esVerdad(dicho.texto.includes("no es el formato"), "apunta a la conexión o la cuenta");
    });
  }],

  ["un toque de la sonda se apunta con el tipo con el que llegó", async () => {
    await conSonda({ enviado: {}, pintado: {} }, async () => {
      // Botón clásico de la variante 6.
      await sonda.onEvent(null, {
        type: "notify",
        messages: [{ message: { buttonsResponseMessage: { selectedButtonId: "sonda6", selectedDisplayText: "Tocar" } } }],
      });
      const datos = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
      igual(datos.pintado.clasico, "clasico", "apunta la 6 como clásico");

      // Un toque que no es de la sonda no apunta nada.
      await sonda.onEvent(null, {
        type: "notify",
        messages: [{ message: { buttonsResponseMessage: { selectedButtonId: "otro", selectedDisplayText: "x" } } }],
      });
      const despues = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
      igual(Object.keys(despues.pintado).length, 1, "no se apunta ruido");
    });
  }],
];
