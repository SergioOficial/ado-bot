/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/wa-nodes.js — el envoltorio binario de los mensajes con botones.
 *
 * Un mensaje con botones no se dibuja solo porque el protobuf esté bien:
 * WhatsApp espera unos nodos binarios alrededor, los mismos que emite el
 * cliente oficial. Si faltan, el servidor **acepta** el mensaje y el teléfono
 * lo tira sin pintar nada: ni error, ni aviso. Eso explica la mitad de los «no
 * me salen los botones» que circulan por ahí.
 *
 *   biz → interactive(type=native_flow, v=1) → native_flow(v=9, mixed)
 *   + quality_control
 *   + bot(biz_bot=1)  solo en chats privados
 *
 * Portado tal cual de Shin-MD (`src/lib/wa-nodes.js`), que es donde se
 * verificó que hace falta.
 *
 * 10-nov-2026: el nodo ya no se escribe a mano si la librería trae el suyo.
 * Comparando los dos (ver docs/CLIENTE.md) el nuestro salía sin `decision_id`
 * ni `<decision_source value="df"/>`, que es lo que emite el cliente oficial.
 */

import { randomBytes } from "node:crypto";
import { getBizBinaryNode } from "./baileys.js";

/** ¿Es un chat de una sola persona? WhatsApp ya usa @lid además del viejo. */
export function esPrivado(jid = "") {
  return typeof jid === "string" && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

/**
 * El nodo `biz` escrito a mano. Es el respaldo: se usa solo si el cliente
 * instalado no expone su propio constructor.
 *
 * Lleva `decision_id` y el hijo `<decision_source value="df"/>` porque son los
 * que emite el cliente oficial (y la propia librería en `getBizBinaryNode`).
 * Faltaban, y no es un adorno: ese nodo es la pista que le dice al teléfono
 * con qué camino dibujar el mensaje. Un mensaje con el `biz` incompleto se
 * acepta igual y luego el cliente puede contestar «actualiza WhatsApp».
 */
export function nodoBizPropio() {
  return {
    tag: "biz",
    attrs: {
      actual_actors: "2",
      host_storage: "2",
      privacy_mode_ts: Math.floor(Date.now() / 1000).toString(),
    },
    content: [
      {
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
      },
      {
        tag: "quality_control",
        attrs: {
          decision_id: semillaDecision(),
          source_type: "third_party",
        },
        content: [{ tag: "decision_source", attrs: { value: "df" } }],
      },
    ],
  };
}

/** 20 bytes en hexadecimal, como el `decision_id` del cliente oficial. */
function semillaDecision() {
  try {
    return randomBytes(20).toString("hex");
  } catch {
    return Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40);
  }
}

/**
 * Nodos que acompañan a un mensaje interactivo.
 *
 * Si se pasa `contenido` (el mensaje ya armado) y la librería trae su propio
 * `getBizBinaryNode`, se usa **el suyo**: es el que está al día con lo que
 * WhatsApp espera hoy. Escribirlo a mano fue justo lo que nos dejó un nodo
 * incompleto (sin `decision_id` ni `decision_source`).
 *
 * @param {string} jid
 * @param {object} [op]
 * @param {boolean} [op.ai=true] poner el nodo `bot` en privados (la ✨ de IA)
 * @param {object} [op.contenido] mensaje armado, para que lo lea la librería
 * @returns {object[]} para pasar como `additionalNodes` a relayMessage
 */
export function nodosInteractivos(jid, { ai = true, contenido = null } = {}) {
  let biz = null;
  if (contenido && typeof getBizBinaryNode === "function") {
    try {
      const suyo = getBizBinaryNode(contenido);
      if (suyo && suyo.tag === "biz") biz = suyo;
    } catch {
      biz = null;
    }
  }
  const nodos = [biz || nodoBizPropio()];
  if (esPrivado(jid) && ai) nodos.push({ tag: "bot", attrs: { biz_bot: "1" } });
  return nodos;
}

/** Marca que Baileys pone a las encuestas que manda él. */
export function nodosEncuesta() {
  return [{ tag: "meta", attrs: { polltype: "creation" } }];
}

export default { nodosInteractivos, nodosEncuesta, esPrivado };
