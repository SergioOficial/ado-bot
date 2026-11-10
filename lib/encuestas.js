/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/encuestas.js — encuesta, quiz y voto múltiple.
 *
 * Lo que hacen los demás bots: mandar una imagen con las opciones dibujadas y
 * contar los puntos a mano. WhatsApp sí sabe hacer tres cosas, y esto las manda
 * nativas:
 *
 *   · ENCUESTA normal (pollType 0): una respuesta.
 *   · QUIZ (pollType 1 + correctAnswer): al votar, WhatsApp mismo marca en
 *     verde el acierto y en rojo el fallo, en el móvil de cada quien. Funciona
 *     aunque el bot esté caído.
 *   · VOTO MÚLTIPLE (selectableOptionsCount > 1): deja elegir varias.
 *
 * Dos cosas que se olvidan y rompen la encuesta SIN dar error:
 *
 *   1. messageSecret (32 bytes). Sin él la encuesta se ve, la gente vota y los
 *      votos NO se pueden descifrar.
 *   2. El nodo binario `meta polltype=creation` al relayear. Sin él el servidor
 *      no la registra como encuesta nueva (lo mismo pone Baileys cuando manda
 *      una encuesta con su atajo).
 */
import { randomBytes } from "node:crypto";
import { proto, generateWAMessageFromContent } from "./baileys.js";

export const MIN_OPCIONES = 2;
export const MAX_OPCIONES = 12;
export const TIPO_ENCUESTA = 0;
export const TIPO_QUIZ = 1;

/**
 * Interpreta la línea escrita.
 *
 *   "¿Pizza?|Pepperoni|Hawaiana"            → encuesta
 *   "¿Capital?|Kioto|*Tokio|Osaka"          → quiz (el asterisco marca)
 *   "multi ¿Qué días?|Lunes|Martes|Viernes" → varias respuestas
 *
 * @returns {{ok:boolean, error?:string, tipo?:string, pregunta?:string,
 *            opciones?:string[], correcta?:number, seleccionables?:number}}
 *   error: "vacio" | "sin-plecas" | "sin-pregunta" | "pocas" | "muchas" |
 *          "varias-correctas" | "opcion-vacia"
 */
export function interpretar(texto = "") {
  let t = String(texto || "").trim();
  if (!t) return { ok: false, error: "vacio" };

  let multiple = false;
  const conMulti = t.match(/^(multi|múlti|multiple|múltiple|varias|varios)\s+/i);
  if (conMulti) {
    multiple = true;
    t = t.slice(conMulti[0].length).trim();
  }

  if (!t.includes("|")) return { ok: false, error: "sin-plecas" };

  // Sin filtrar los vacíos: `a||b` es un error que hay que decir, no una
  // opción que se pierde en silencio (el original la tiraba con filter).
  const partes = t.split("|").map((s) => s.trim());
  if (partes.some((p) => p === "")) {
    return { ok: false, error: partes[0] === "" ? "sin-pregunta" : "opcion-vacia" };
  }
  const pregunta = partes.shift();
  const crudas = partes;

  if (!pregunta) return { ok: false, error: "sin-pregunta" };
  if (crudas.length < MIN_OPCIONES) return { ok: false, error: "pocas" };
  if (crudas.length > MAX_OPCIONES) return { ok: false, error: "muchas" };
  if (pregunta.length > 255) return { ok: false, error: "pregunta-larga" };

  // ¿Hay marca de correcta? Entonces es quiz.
  const marcadas = [];
  const opciones = crudas.map((o, i) => {
    if (o.startsWith("*") || o.endsWith("*")) marcadas.push(i);
    return o.replace(/^\*+|\*+$/g, "").trim();
  });

  if (opciones.some((o) => !o)) return { ok: false, error: "opcion-vacia" };
  if (opciones.some((o) => o.length > 100)) return { ok: false, error: "opcion-larga" };
  if (marcadas.length > 1) return { ok: false, error: "varias-correctas" };

  if (marcadas.length === 1) {
    // Un quiz es siempre de una respuesta: WhatsApp no admite otra cosa.
    return {
      ok: true,
      tipo: "quiz",
      pregunta,
      opciones,
      correcta: marcadas[0],
      seleccionables: 1,
    };
  }

  return {
    ok: true,
    tipo: "encuesta",
    pregunta,
    opciones,
    seleccionables: multiple ? opciones.length : 1,
  };
}

/** Mensaje de ayuda/error, en cristiano. */
export function explicarError(error, prefijo = ".") {
  const ayuda =
    `\n> Ejemplo: *${prefijo}encuesta ¿Qué pizza?|Pepperoni|Hawaiana*\n` +
    `> Quiz: *${prefijo}encuesta ¿Capital de Japón?|Kioto|*Tokio*|Osaka* (el asterisco marca la buena)\n` +
    `> Varias respuestas: *${prefijo}encuesta multi ¿Qué días?|Lunes|Martes|Viernes*`;
  const textos = {
    vacio: "Escríbeme la encuesta separando con *|*.",
    "sin-plecas": "Falta el separador *|* entre la pregunta y las opciones.",
    "sin-pregunta": "Falta la pregunta (lo primero, antes del primer *|*).",
    pocas: `Hacen falta al menos *${MIN_OPCIONES}* opciones.`,
    muchas: `WhatsApp admite como mucho *${MAX_OPCIONES}* opciones.`,
    "varias-correctas": "Solo puede haber *una* respuesta correcta marcada con asterisco.",
    "opcion-vacia": "Hay una opción vacía (dos *|* seguidos).",
    "opcion-larga": "Una opción pasa de 100 caracteres.",
    "pregunta-larga": "La pregunta pasa de 255 caracteres.",
  };
  return `《✧》 ${textos[error] || "No entendí la encuesta."}${ayuda}`;
}

/**
 * Arma el contenido protobuf. Separado para poder probarlo sin red.
 * Devuelve directamente el `Message` listo para relayear.
 */
export function construir(encuesta, secreto = randomBytes(32)) {
  if (!encuesta?.opciones?.length) throw new Error("la encuesta no tiene opciones");

  const contenido = {
    messageContextInfo: { messageSecret: secreto },
    pollCreationMessageV3: {
      name: encuesta.pregunta,
      selectableOptionsCount: encuesta.seleccionables || 1,
      options: encuesta.opciones.map((optionName) => ({ optionName })),
    },
  };

  if (encuesta.tipo === "quiz") {
    contenido.pollCreationMessageV3.pollType = TIPO_QUIZ;
    // La respuesta correcta tiene que coincidir con una de las opciones.
    contenido.pollCreationMessageV3.correctAnswer = {
      optionName: encuesta.opciones[encuesta.correcta],
    };
  }

  return proto.Message.fromObject(contenido);
}

/** Los nodos que hacen que el servidor la registre como encuesta nueva. */
export function nodosEncuesta() {
  return [{ tag: "meta", attrs: { polltype: "creation" } }];
}

/**
 * Manda la encuesta. Nunca lanza: devuelve `{ ok, key?, error? }`.
 */
export async function enviarEncuesta(sock, jid, encuesta, { cita = null } = {}) {
  try {
    const contenido = construir(encuesta);
    const armado = await generateWAMessageFromContent(jid, contenido, {
      userJid: sock.user?.id || sock.user?.jid,
      quoted: cita || undefined,
    });
    if (!armado?.key?.id) throw new Error("no se generó el mensaje de la encuesta");

    await sock.relayMessage(jid, armado.message, {
      messageId: armado.key.id,
      additionalNodes: nodosEncuesta(),
    });
    return { ok: true, key: armado.key };
  } catch (error) {
    return { ok: false, error };
  }
}
