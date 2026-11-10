/**
 * lib/botones.js — botones nativos de WhatsApp, en un solo sitio.
 *
 * Antes cada plugin que quería botones copiaba el mismo bloque de
 * `proto.Message.fromObject({ viewOnceMessage: ... })`. Aquí está una vez, con
 * respaldo: si el cliente de quien recibe no pinta botones, el texto se lee
 * igual y los botones quedan como líneas al final.
 *
 * Comprobado con el proto del paquete instalado (ida y vuelta de bytes): los
 * campos `interactiveMessage`, `nativeFlowMessage` y la respuesta
 * `interactiveResponseMessage.nativeFlowResponseMessage` sobreviven enteros, así
 * que también se puede leer qué botón pulsó la persona.
 */

import { proto, generateWAMessageFromContent, WA_DEFAULT_EPHEMERAL } from "./baileys.js";

/** Tipos de botón que WhatsApp Web pinta hoy en cuentas normales. */
export const BOTON = {
  RAPIDO: "quick_reply",
  COPIAR: "cta_copy",
  ENLACE: "cta_url",
  LLAMAR: "cta_call",
  RECORDAR: "cta_reminder",
  CANCELAR_RECORDAR: "cta_cancel_reminder",
};

/**
 * Arma el texto de respaldo: lo que verá quien no tenga botones.
 * `botones` es una lista de `{ texto }` o `{ texto, url }`.
 */
export function respaldo(pie, botones = []) {
  if (!botones.length) return pie;
  const lineas = botones.map((b) => (b.url ? `▸ ${b.texto}: ${b.url}` : `▸ ${b.texto}`));
  return `${pie}\n\n${lineas.join("\n")}`;
}

/** Botón de respuesta rápida: manda el texto `id` como si lo hubieran escrito. */
export function rapido(texto, id = texto) {
  return {
    name: BOTON.RAPIDO,
    buttonParamsJson: JSON.stringify({ display_text: texto, id }),
  };
}

/** Botón que copia un texto al portapapeles. */
export function copiar(texto, contenido) {
  return {
    name: BOTON.COPIAR,
    buttonParamsJson: JSON.stringify({ display_text: texto, copy_code: contenido }),
  };
}

/** Botón que abre un enlace. */
export function enlace(texto, url) {
  return {
    name: BOTON.ENLACE,
    buttonParamsJson: JSON.stringify({ display_text: texto, url, merchant_url: url }),
  };
}

/** Botón que abre el marcador con un número. */
export function llamar(texto, numero) {
  return {
    name: BOTON.LLAMAR,
    buttonParamsJson: JSON.stringify({ display_text: texto, phone_number: numero }),
  };
}

/**
 * Manda un mensaje con botones.
 *
 * @param {object} sock
 * @param {string} jid   chat destino
 * @param {object} opciones
 * @param {string} opciones.texto    cuerpo del mensaje
 * @param {string} [opciones.titulo] encabezado
 * @param {string} [opciones.pie]    letra pequeña (nombre del bot, etc.)
 * @param {Array}  opciones.botones  los que devuelven `rapido`, `copiar`, ...
 * @param {object} [opciones.cita]   mensaje a citar
 * @param {string} [opciones.mencion] número a mencionar en el cuerpo
 * @returns {Promise<object>} el mensaje enviado
 */
export async function enviarConBotones(sock, jid, opciones) {
  const {
    texto = "",
    titulo = "",
    pie = "",
    botones = [],
    cita = null,
    mencion = null,
  } = opciones || {};

  if (!botones.length) {
    return sock.sendMessage(jid, { text: texto }, cita ? { quoted: cita } : undefined);
  }

  const cuerpo = respaldo(texto, []);
  const contenido = proto.Message.fromObject({
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: {
          body: { text: cuerpo },
          footer: { text: pie },
          header: titulo
            ? { title: titulo, hasMediaAttachment: false }
            : { hasMediaAttachment: false },
          nativeFlowMessage: { buttons: botones },
        },
      },
    },
  });

  try {
    const armado = await generateWAMessageFromContent(jid, contenido, {
      userJid: sock.user?.id || sock.user?.jid,
      quoted: cita || undefined,
      ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
    });

    if (mencion) {
      await sock.sendMessage(jid, { text: `@${mencion}`, mentions: [`${mencion}@s.whatsapp.net`] });
    }

    await sock.relayMessage(jid, armado.message, { messageId: armado.key.id });
    return armado;
  } catch (err) {
    // Si el relay falla, se manda el texto con los botones escritos: peor
    // presentación, pero la persona recibe la información.
    console.warn("⚠️  Botones no enviados, se manda el texto:", err.message);
    const comoTexto = botones.map((b) => {
      let p = {};
      try {
        p = JSON.parse(b.buttonParamsJson || "{}");
      } catch {
        p = {};
      }
      return { texto: p.display_text || p.copy_code || "opción", url: p.url || p.merchant_url || null };
    });
    return sock.sendMessage(
      jid,
      { text: respaldo(texto, comoTexto) },
      cita ? { quoted: cita } : undefined
    );
  }
}

/**
 * Lee qué botón pulsó alguien. Devuelve `{ id, nombre }` o `null`.
 * Sirve para responder a la pulsación en el mismo `messages.upsert`.
 */
export function botonPulsado(m) {
  const resp = m?.message?.interactiveResponseMessage;
  if (!resp) return null;
  const flujo = resp.nativeFlowResponseMessage;
  if (!flujo) return null;
  let id = null;
  try {
    id = JSON.parse(flujo.paramsJson || "{}")?.id ?? null;
  } catch {
    id = null;
  }
  return { id, nombre: flujo.name || null, texto: resp.body?.text || null };
}
