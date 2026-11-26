/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
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
 * 10-nov-2026: el nodo ya no se escribe a mano si la librería trae el suyo.
 * 26-nov-2026: el nodo de la librería se **repara**. Su tabla solo conoce seis
 * nombres y deja los flujos de pago sin `native_flow_name`; aquí se completan
 * los alias y se añade el hijo `native_flow` cuando el mensaje lo pide. Sigue
 * habiendo un solo `biz`: dos hacen que WhatsApp descarte el mensaje.
 */

import { randomBytes } from "node:crypto";
import { getBizBinaryNode } from "./baileys.js";

/**
 * Botones cuyo flujo lleva nombre propio en el nodo `biz`.
 * Los demás, incluido `open_webview`, siguen con `mixed`: es lo correcto para
 * un botón normal y lo que entiende también el cliente de escritorio.
 */
export const FLUJOS_NOMBRADOS = new Set([
  "mpm",
  "cta_catalog",
  "catalog_message",
  "send_location",
  "call_permission_request",
  "wa_payment_transaction_details",
  "automated_greeting_message_view_catalog",
  "form_message",
  "single_select",
]);

/** Estos van en el atributo `native_flow_name` del `biz`, no en un hijo. */
export const ALIAS_PEDIDO = {
  review_and_pay: "order_details",
  review_order: "order_status",
  payment_info: "payment_info",
  payment_status: "payment_status",
  payment_method: "payment_method",
  order_details: "order_details",
  order_status: "order_status",
  track_order: "track_order",
  reorder: "reorder",
  cancel_order: "cancel_order",
};

/** ¿Es un chat de una sola persona? WhatsApp ya usa @lid además del viejo. */
export function esPrivado(jid = "") {
  return typeof jid === "string" && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

/** 20 bytes en hexadecimal, como el `decision_id` del cliente oficial. */
function semillaDecision() {
  try {
    return randomBytes(20).toString("hex");
  } catch {
    return Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40);
  }
}

/** Nodo `quality_control`, con los dos campos que emite el cliente oficial. */
function nodoCalidad() {
  return {
    tag: "quality_control",
    attrs: {
      decision_id: semillaDecision(),
      source_type: "third_party",
    },
    content: [{ tag: "decision_source", attrs: { value: "df" } }],
  };
}

/** El hijo `native_flow` acorde al nombre del botón. */
function hijoFlujo(nombre) {
  if (nombre === "form_message") return { tag: "native_flow", attrs: { name: nombre } };
  if (FLUJOS_NOMBRADOS.has(nombre)) return { tag: "native_flow", attrs: { v: "2", name: nombre } };
  return { tag: "native_flow", attrs: { v: "9", name: "mixed" } };
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
 *
 * @param {object} [opciones]
 * @param {string} [opciones.flujo] nombre del primer botón, si es conocido
 */
export function nodoBizPropio({ flujo = "mixed" } = {}) {
  const nombre = String(flujo || "mixed");
  const attrs = {
    actual_actors: "2",
    host_storage: "2",
    privacy_mode_ts: Math.floor(Date.now() / 1000).toString(),
  };

  // Los mensajes de pago no llevan hijo `interactive`: el nombre va arriba.
  if (ALIAS_PEDIDO[nombre]) {
    attrs.native_flow_name = ALIAS_PEDIDO[nombre];
    return { tag: "biz", attrs, content: [nodoCalidad()] };
  }

  return {
    tag: "biz",
    attrs,
    content: [
      {
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [hijoFlujo(nombre)],
      },
      nodoCalidad(),
    ],
  };
}

/** Saca el nombre del primer botón de un mensaje ya armado. */
export function nombreDeFlujo(contenido) {
  const raiz = contenido?.interactiveMessage || contenido?.templateMessage?.interactiveMessageTemplate || null;
  return raiz?.nativeFlowMessage?.buttons?.[0]?.name || null;
}

/** ¿Hay algo aquí que necesite nodo `biz` aunque la librería no lo detecte? */
function necesitaBiz(contenido) {
  return Boolean(
    contenido?.interactiveMessage ||
      contenido?.templateMessage ||
      contenido?.buttonsMessage ||
      contenido?.listMessage ||
      contenido?.botForwardedMessage?.message?.richResponseMessage ||
      contenido?.botForwardedMessage?.message?.interactiveMessage,
  );
}

/**
 * Complete el nodo que devuelve la librería. No se escribe uno nuevo: se
 * conservan sus atributos (entre ellos `decision_id`) y solo se corrigen los
 * huecos de su tabla de flujos.
 */
function repararBiz(biz, contenido) {
  if (!biz || biz.tag !== "biz") return biz;
  const nombre = nombreDeFlujo(contenido);
  if (!nombre) return biz;

  const salida = { ...biz, attrs: { ...biz.attrs }, content: [...(biz.content || [])] };
  const alias = ALIAS_PEDIDO[nombre];
  if (alias && !salida.attrs.native_flow_name) salida.attrs.native_flow_name = alias;

  if (FLUJOS_NOMBRADOS.has(nombre) && !salida.content.some((n) => n.tag === "interactive")) {
    salida.content.unshift({
      tag: "interactive",
      attrs: { type: "native_flow", v: "1" },
      content: [hijoFlujo(nombre)],
    });
  }
  if (!salida.content.some((n) => n.tag === "quality_control")) salida.content.push(nodoCalidad());
  return salida;
}

/**
 * Nodos que acompañan a un mensaje interactivo.
 *
 * Si se pasa `contenido` y la librería trae su propio `getBizBinaryNode`, se usa
 * el suyo y se repara. Si no, se escribe el de aquí. En los dos casos sale un
 * solo nodo `biz`, con `quality_control` y, en privado, el nodo `bot`.
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
      if (suyo && suyo.tag === "biz") biz = repararBiz(suyo, contenido);
    } catch {
      biz = null;
    }
  }
  if (!biz && contenido && necesitaBiz(contenido)) {
    biz = nodoBizPropio({ flujo: nombreDeFlujo(contenido) || "mixed" });
  }
  const nodos = [biz || nodoBizPropio()];
  if (esPrivado(jid) && ai) nodos.push({ tag: "bot", attrs: { biz_bot: "1" } });
  return nodos;
}

/** Marca que Baileys pone a las encuestas que manda él. */
export function nodosEncuesta() {
  return [{ tag: "meta", attrs: { polltype: "creation" } }];
}

export default {
  nodosInteractivos,
  nodosEncuesta,
  nodoBizPropio,
  nombreDeFlujo,
  esPrivado,
};
