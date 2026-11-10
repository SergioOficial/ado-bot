/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * lib/botones.js — botones nativos de WhatsApp, en un solo sitio.
 *
 * Antes cada plugin que quería botones copiaba el mismo bloque de
 * `proto.Message.fromObject({ viewOnceMessage: ... })`. Aquí está una vez.
 *
 * TRES COSAS QUE SE APRENDIERON PORTANDO LOS BOTONES DE SHIN-MD
 * ------------------------------------------------------------
 * 1. **Nada de envolver en `viewOnceMessage`.** Copiar ese envoltorio es de
 *    2022 y es justo lo que hace que los botones salgan grises o no salgan en
 *    WhatsApp Web. El mensaje va como `interactiveMessage` suelto.
 *    Para volver al envoltorio de antes: `BOTONES_VIEWONCE=1`.
 * 2. **Hacen falta nodos binarios** (`lib/wa-nodes.js`). Sin ellos el servidor
 *    acepta el mensaje y el teléfono no pinta nada, sin avisar.
 * 3. **WhatsApp solo dibuja tres botones.** El cuarto y siguientes se pierden
 *    en silencio salvo que se pida la hoja inferior (`messageParamsJson`).
 *
 * Si algo de esto falla, el texto se manda igual con las opciones escritas: el
 * respaldo no es un adorno, es lo que evita que alguien se quede sin respuesta.
 * Y todo se apaga con `BOTONES=off`.
 */

import {
  proto,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  WA_DEFAULT_EPHEMERAL,
} from "./baileys.js";
import { nodosInteractivos } from "./wa-nodes.js";

/** Cuántos botones ve la gente sin desplegar nada. */
export const MAX_BOTONES_VISIBLES = 3;

/** Tipos de botón que WhatsApp Web pinta hoy en cuentas normales. */
export const BOTON = {
  RAPIDO: "quick_reply",
  COPIAR: "cta_copy",
  ENLACE: "cta_url",
  LLAMAR: "cta_call",
  RECORDAR: "cta_reminder",
  CANCELAR_RECORDAR: "cta_cancel_reminder",
  UBICACION: "send_location",
  WEBVIEW: "open_webview",
  LISTA: "single_select",
};

/**
 * ¿Se mandan botones o texto normal?
 *
 * Interruptor para apagarlos sin tocar código: `BOTONES=off` en el entorno (o
 * `BOTONES=0`). Con los botones apagados todo sale como texto con las opciones
 * escritas, que es lo mismo que recibe un móvil que no pinta botones.
 */
export function botonesActivos() {
  const valor = String(process.env.BOTONES ?? "").trim().toLowerCase();
  return !["off", "0", "no", "false", "apagados"].includes(valor);
}

/** ¿Se conserva el envoltorio viejo de `viewOnceMessage`? (no, por defecto) */
function conViewOnce() {
  return String(process.env.BOTONES_VIEWONCE ?? "").trim() === "1";
}

/**
 * Formato de los mensajes con botones.
 *
 *   moderno   (por defecto)  `interactiveMessage` + native flow. Lo pinta todo
 *                            cliente reciente; los viejos contestan «actualiza
 *                            WhatsApp» en vez de enseñar la tarjeta.
 *   plantilla                el mismo interactivo, envuelto en `templateMessage`
 *                            (`interactiveMessageTemplate`). Es el envoltorio
 *                            que sí entienden los clientes viejos: la tarjeta
 *                            se ve más simple, pero no sale el aviso.
 *   clasico                  `buttonsMessage` de toda la vida (solo respuesta
 *                            rápida). Lo ven todos; lo que devuelve el teléfono
 *                            es texto normal, así que tampoco hay aviso.
 *
 * Se cambia sin tocar plugins: `BOTONES_FORMATO=plantilla` (o `clasico`).
 */
export function formatoBotones() {
  const valor = String(process.env.BOTONES_FORMATO ?? "").trim().toLowerCase();
  if (["clasico", "clásico", "buttons", "legacy"].includes(valor)) return "clasico";
  if (["plantilla", "template", "compatible"].includes(valor)) return "plantilla";
  return "moderno";
}

/**
 * Convierte nuestros botones al formato clásico (`buttonsMessage`).
 *
 * Devuelve `null` si alguno no tiene equivalente clásico (lista desplegable,
 * enlace, copiar, llamar): en ese caso mandarlo como clásico dejaría la mitad
 * de las opciones sin pintar, y eso es peor que la tarjeta moderna.
 */
export function comoClasico(botones = []) {
  if (!botones.length) return null;
  const salida = [];
  for (const b of botones) {
    if (b?.name !== BOTON.RAPIDO) return null;
    let p = {};
    try {
      p = JSON.parse(b.buttonParamsJson || "{}");
    } catch {
      return null;
    }
    if (!p.id) return null;
    salida.push({ text: p.display_text || String(p.id), id: String(p.id) });
  }
  return salida;
}

// ── constructores ───────────────────────────────────────────────────────────

/** Botón de respuesta rápida: manda el texto `id` como si lo hubieran escrito. */
export function rapido(texto, id = texto) {
  return { name: BOTON.RAPIDO, buttonParamsJson: JSON.stringify({ display_text: texto, id }) };
}

/** Botón que copia un texto al portapapeles. */
export function copiar(texto, contenido) {
  return { name: BOTON.COPIAR, buttonParamsJson: JSON.stringify({ display_text: texto, copy_code: contenido }) };
}

/** Botón que abre un enlace. */
export function enlace(texto, url) {
  return { name: BOTON.ENLACE, buttonParamsJson: JSON.stringify({ display_text: texto, url, merchant_url: url }) };
}

/** Botón que abre el marcador con un número. */
export function llamar(texto, numero) {
  return { name: BOTON.LLAMAR, buttonParamsJson: JSON.stringify({ display_text: texto, phone_number: String(numero) }) };
}

/** Recordatorio nativo: lo avisa WhatsApp, no el bot. */
export function recordar(texto = "Recordármelo", id = "") {
  return { name: BOTON.RECORDAR, buttonParamsJson: JSON.stringify({ display_text: texto, id: id || texto }) };
}

/** Pide al usuario que comparta su ubicación de un toque. */
export function ubicacion(texto = "Mandar mi ubicación") {
  return { name: BOTON.UBICACION, buttonParamsJson: JSON.stringify({ display_text: texto }) };
}

/** Mini web dentro de WhatsApp, sin salir al navegador. */
export function webview(titulo, url, enApp = true) {
  return {
    name: BOTON.WEBVIEW,
    buttonParamsJson: JSON.stringify({ title: titulo, link: { in_app_webview: Boolean(enApp), url } }),
  };
}

/**
 * Lista desplegable nativa.
 *
 * @param {string} titulo
 * @param {Array<{title:string, highlight_label?:string, rows:Array<{id:string,title:string,description?:string}>}>} secciones
 */
export function lista(titulo, secciones = []) {
  const limpias = secciones.map((s) => ({
    title: s.title || "",
    highlight_label: s.highlight_label || "",
    rows: (s.rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
    })),
  }));
  return { name: BOTON.LISTA, buttonParamsJson: JSON.stringify({ title: titulo, sections: limpias }) };
}

/**
 * Parámetros de la hoja inferior: con más de tres botones hay que pedirla o
 * los sobrantes no se dibujan (y nadie avisa).
 */
export function paramsHoja(botones = [], opciones = {}) {
  const total = Array.isArray(botones) ? botones.filter(Boolean).length : 0;
  if (total <= MAX_BOTONES_VISIBLES && !opciones.forzar) return null;
  return JSON.stringify({
    bottom_sheet: {
      in_thread_buttons_limit: Math.min(opciones.visibles || MAX_BOTONES_VISIBLES, MAX_BOTONES_VISIBLES),
      divider_indices: Array.isArray(opciones.divisiones) ? opciones.divisiones : [],
      list_title: opciones.titulo || "Más opciones",
      button_title: opciones.boton || "Ver todo",
    },
    has_multiple_buttons: true,
  });
}

// ── respaldo en texto ───────────────────────────────────────────────────────

/** Convierte botones armados en la lista de texto del respaldo. */
export function desarmar(botones = []) {
  return botones.map((b) => {
    let p = {};
    try {
      p = JSON.parse(b.buttonParamsJson || "{}");
    } catch {
      p = {};
    }
    return { texto: p.display_text || p.copy_code || p.title || "opción", url: p.url || p.merchant_url || null };
  });
}

// Prefijo que se escribe delante de cada comando en el respaldo. Se lo dice
// `index.js` al arrancar (`usarPrefijoBotones(config.prefix[0])`); si nadie lo
// dice, un punto. No se importa `config.js` aquí para no atar la librería a la
// configuración.
let PREFIJO = ".";

/** Le dice al respaldo cuál es el prefijo real del bot. Se llama una vez. */
export function usarPrefijoBotones(prefijo) {
  if (typeof prefijo === "string" && prefijo.trim()) PREFIJO = prefijo.trim();
}

/** Deja el id listo para copiarlo y pegarlo en el chat. */
function conPrefijo(id) {
  const limpio = String(id ?? "").trim();
  return limpio ? `${PREFIJO}${limpio}` : limpio;
}

/**
 * Texto de respaldo. Acepta la lista de botones armados y también la de
 * `{texto, url}` ya desarmada. Las listas desplegables se escriben renglón por
 * renglón para que se pueda escribir el comando a mano.
 *
 * Los ids salen CON el prefijo del bot pegado (`▸ Ver todo → .allmenu`). Antes
 * salían pelados (`→ allmenu`), y eso copiado no ejecuta nada: quien no veía
 * los botones se quedaba leyendo una lista de palabras que no funcionaban.
 */
export function respaldo(pie, botones = []) {
  if (!botones.length) return pie;
  const lineas = [];
  for (const b of botones) {
    if (b.name === BOTON.LISTA) {
      let p = {};
      try {
        p = JSON.parse(b.buttonParamsJson || "{}");
      } catch {
        p = {};
      }
      lineas.push(`▸ ${p.title || "Opciones"}:`);
      for (const seccion of p.sections || []) {
        for (const fila of seccion.rows || []) lineas.push(`   • ${fila.title} → ${conPrefijo(fila.id)}`);
      }
    } else if (b.name) {
      const [d] = desarmar([b]);
      if (d.url) {
        lineas.push(`▸ ${d.texto}: ${d.url}`);
      } else {
        // Sin enlace, lo útil es el comando para escribirlo.
        let id = null;
        try {
          id = JSON.parse(b.buttonParamsJson || "{}")?.id ?? null;
        } catch {
          id = null;
        }
        lineas.push(id ? `▸ ${d.texto} → ${conPrefijo(id)}` : `▸ ${d.texto}`);
      }
    } else {
      lineas.push(b.url ? `▸ ${b.texto}: ${b.url}` : `▸ ${b.texto}`);
    }
  }
  return `${pie}\n\n${lineas.join("\n")}`;
}

// ── envío ───────────────────────────────────────────────────────────────────

/** Prepara la imagen de cabecera, si se pidió y se puede. */
async function prepararImagen(sock, imagen) {
  if (!imagen) return null;
  try {
    if (typeof prepareWAMessageMedia !== "function" || !sock?.waUploadToServer) return null;
    const fuente = typeof imagen === "string" && /^https?:\/\//i.test(imagen) ? { url: imagen } : imagen;
    const media = await prepareWAMessageMedia({ image: fuente }, { upload: sock.waUploadToServer });
    return media?.imageMessage || null;
  } catch {
    // Sin cabecera se manda igual: la foto no vale perder el mensaje entero.
    return null;
  }
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
 * @param {Array}  opciones.botones  los que devuelven `rapido`, `lista`, ...
 * @param {object} [opciones.cita]   mensaje a citar
 * @param {string} [opciones.imagen] URL o buffer para la cabecera
 * @param {object} [opciones.hoja]   ajustes de la hoja inferior (más de 3)
 * @returns {Promise<object|null>}
 */
export async function enviarConBotones(sock, jid, opciones) {
  const { texto = "", titulo = "", pie = "", botones = [], cita = null, imagen = null, hoja = {} } = opciones || {};
  const citar = cita ? { quoted: cita } : undefined;

  // Sin botones, o apagados a propósito: texto con las opciones escritas.
  if (!botones.length || !botonesActivos()) {
    const plano = botones.length ? respaldo(texto, botones) : texto;
    return sock.sendMessage(jid, { text: plano }, citar);
  }

  try {
    // Los canales no admiten botones de ninguna forma.
    if (typeof jid === "string" && jid.endsWith("@newsletter")) {
      return await sock.sendMessage(jid, { text: respaldo(texto, botones) }, citar);
    }

    const formato = formatoBotones();

    // Camino clásico: lo manda la propia librería, que además pone su nodo biz.
    // Solo vale para respuestas rápidas; si no, se sigue por el moderno.
    if (formato === "clasico") {
      const clasicos = comoClasico(botones);
      if (clasicos) {
        return await sock.sendMessage(
          jid,
          { text: texto, footer: pie || undefined, buttons: clasicos },
          citar,
        );
      }
      console.warn("⚠️  BOTONES_FORMATO=clasico no puede con estos botones: se manda el moderno.");
    }

    const imagenPreparada = await prepararImagen(sock, imagen);
    const conMedia = Boolean(imagenPreparada);

    const interactivo = {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: texto }),
        footer: pie ? proto.Message.InteractiveMessage.Footer.fromObject({ text: pie }) : undefined,
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: conMedia ? "" : titulo || "",
          subtitle: "",
          hasMediaAttachment: conMedia,
          imageMessage: imagenPreparada || undefined,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: botones.map((b) => ({ name: b.name, buttonParamsJson: b.buttonParamsJson })),
          messageParamsJson: paramsHoja(botones, hoja) || undefined,
        }),
      }),
    };

    // El envoltorio viejo solo si se pide: es lo que deja los botones grises.
    let contenido = conViewOnce() ? { viewOnceMessage: { message: interactivo } } : interactivo;

    // Formato «plantilla»: el mismo interactivo dentro de un mensaje de
    // plantilla. Es el envoltorio que los clientes viejos entienden, y es la
    // salida cuando el teléfono contesta «actualiza WhatsApp».
    if (formato === "plantilla" && !conViewOnce()) {
      contenido = {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        templateMessage: {
          interactiveMessageTemplate: interactivo.interactiveMessage,
          templateId: `levi-${Date.now()}`,
        },
      };
    }

    const armado = await generateWAMessageFromContent(jid, contenido, {
      userJid: sock.user?.id || sock.user?.jid,
      quoted: cita || undefined,
      ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
    });

    await sock.relayMessage(jid, armado.message, {
      messageId: armado.key.id,
      // Sin estos nodos el teléfono tira el mensaje sin pintar nada. El nodo
      // `biz` lo arma la librería a partir del mensaje: el nuestro a mano salía
      // incompleto (le faltaban decision_id y decision_source).
      additionalNodes: nodosInteractivos(jid, { contenido: armado.message }),
    });

    return armado;
  } catch (err) {
    // Si el relay falla, el texto sale igual con las opciones escritas: peor
    // presentación, pero la persona recibe la información.
    console.warn("⚠️  Botones no enviados, se manda el texto:", err.message);
    return sock.sendMessage(jid, { text: respaldo(texto, botones) }, citar).catch(() => null);
  }
}

/**
 * Lee qué botón pulsó alguien. Devuelve `{ id, nombre, texto, via }` o `null`.
 * Sirve para responder a la pulsación en el mismo `messages.upsert`.
 *
 * POR QUÉ LEE CUATRO FORMAS Y NO UNA
 * ----------------------------------
 * El mismo toque llega con un tipo de mensaje distinto según lo que se haya
 * mandado y lo moderno que sea el cliente:
 *
 *   tarjeta nativa  → interactiveResponseMessage     (lo de siempre)
 *   botón clásico   → buttonsResponseMessage         (BOTONES_FORMATO=clasico)
 *   lista legada    → listResponseMessage            (menús con lista)
 *   plantilla       → templateButtonReplyMessage     (BOTONES_FORMATO=plantilla)
 *
 * Antes solo se entendía la primera. Con las otras tres, `index.js` recibía el
 * toque, no encontraba texto y se quedaba callado: el menú «funcionaba» pero no
 * hacía nada. Pasó a ser urgente desde que el formato clásico se puede elegir.
 */
export function botonPulsado(m) {
  const msg = m?.message;
  if (!msg) return null;

  // 1. Tarjeta nativa (native flow). Es la de siempre.
  const nativa = msg.interactiveResponseMessage;
  if (nativa) {
    const flujo = nativa.nativeFlowResponseMessage;
    if (flujo) {
      let id = null;
      try {
        id = JSON.parse(flujo.paramsJson || "{}")?.id ?? null;
      } catch {
        id = null;
      }
      if (id) return { id, nombre: flujo.name || null, texto: nativa.body?.text || null, via: "nativa" };
      return null;
    }
    // Algunos clientes mandan la fila elegida como cuerpo de la respuesta.
    const fila = nativa.body?.text;
    return fila ? { id: String(fila), nombre: null, texto: fila, via: "nativa-texto" } : null;
  }

  // 2. Botones clásicos (buttonsMessage → buttonsResponseMessage).
  const clasico = msg.buttonsResponseMessage;
  if (clasico?.selectedButtonId) {
    return {
      id: String(clasico.selectedButtonId),
      nombre: null,
      texto: clasico.selectedDisplayText || null,
      via: "clasico",
    };
  }

  // 3. Lista legada (listMessage → listResponseMessage).
  const lista = msg.listResponseMessage;
  if (lista?.singleSelectReply?.selectedRowId) {
    return {
      id: String(lista.singleSelectReply.selectedRowId),
      nombre: null,
      texto: lista.title || null,
      via: "lista",
    };
  }

  // 4. Plantilla con botones (templateMessage → templateButtonReplyMessage).
  const plantilla = msg.templateButtonReplyMessage;
  if (plantilla?.selectedId) {
    return {
      id: String(plantilla.selectedId),
      nombre: null,
      texto: plantilla.selectedDisplayText || null,
      via: "plantilla",
    };
  }

  return null;
}
