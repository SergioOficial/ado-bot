/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .sonda — averiguar, sin adivinar, qué forma de mensaje pinta tu WhatsApp.
 *
 * EL PROBLEMA QUE RESUELVE
 * ------------------------
 * «Recibiste un mensaje que no es compatible con tu versión de WhatsApp» no
 * dice qué pieza falló. Si el menú entero sale con el cartel, hay que aislar:
 * ¿el tipo de mensaje? ¿la cabecera? ¿el pie? ¿la cita? ¿la hoja inferior?
 *
 * Esta sonda manda ocho mensajes numerados, del más simple al más adornado. En
 * cada uno, si se ve bien, se toca el botón; el bot apunta por qué tipo de
 * mensaje llegó el toque y con eso sabe que ESE formato se pintó. El que no
 * llegue, no se pintó.
 *
 *   .sonda          manda las ocho pruebas (solo el dueño, solo en privado)
 *   .sonda fin      dice qué se pintó y qué formato conviene usar
 *   .sonda reset    borra lo apuntado para repetir
 *
 * Nada de esto adivina: si no hay toque, no hay prueba. Y no manda nada solo:
 * hay que pedirlo.
 */
import fs from "node:fs";
import path from "node:path";
import {
  proto,
  generateWAMessageFromContent,
  getContentType,
} from "../../lib/baileys.js";
import { nodosInteractivos } from "../../lib/wa-nodes.js";
import { rapido } from "../../lib/botones.js";
import { config } from "../../config.js";

const ARCHIVO = path.join(process.cwd(), "data", "sonda.json");
const ESPERA_ENTRE_ENVIOS_MS = 1800;

const VARIANTES = [
  { id: 1, clave: "texto", titulo: "texto plano", nota: "sin botones: el control" },
  { id: 2, clave: "moderno-minimo", titulo: "tarjeta mínima", nota: "solo cuerpo y un botón" },
  { id: 3, clave: "moderno-completo", titulo: "tarjeta como la del menú", nota: "con cabecera y pie" },
  { id: 4, clave: "moderno-cita", titulo: "tarjeta citando tu mensaje", nota: "igual que la 3, pero citando" },
  { id: 5, clave: "moderno-hoja", titulo: "tarjeta con hoja inferior", nota: "como cuando hay más de 3 botones" },
  { id: 6, clave: "clasico", titulo: "botones clásicos", nota: "el formato de toda la vida" },
  { id: 7, clave: "plantilla", titulo: "tarjeta dentro de plantilla", nota: "el envoltorio compatible" },
  { id: 8, clave: "lista", titulo: "lista desplegable", nota: "el menú con secciones" },
];

// ── apuntes ────────────────────────────────────────────────────────────────

function leer() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
  } catch {
    return {};
  }
}

function guardar(datos) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 1));
}

// ── el envío de cada variante ──────────────────────────────────────────────

const boton = (n) =>
  proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
    buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tocar 👆", id: `sonda${n}` }) }],
  });

async function enviarVariante(sock, jid, variante, citar) {
  const { id, clave } = variante;
  const cuerpo = `「SONDA ${id}/8」 ${variante.titulo}\n> ${variante.nota}\n\nSi esto se ve bien, toca el botón. Si sale el cartel, no toques nada.`;

  if (clave === "texto") {
    return sock.sendMessage(jid, { text: cuerpo });
  }

  if (clave === "clasico") {
    return sock.sendMessage(jid, {
      text: cuerpo,
      footer: "formato clásico",
      buttons: [{ text: "Tocar 👆", id: `sonda${id}` }],
    });
  }

  if (clave === "lista") {
    return sock.sendMessage(jid, {
      text: cuerpo,
      title: "Sonda",
      buttonText: "Ver opciones",
      sections: [{ title: "Prueba", rows: [{ id: `sonda${id}`, title: "Tocar aquí", description: "fila de la lista" }] }],
    });
  }

  // Las modernas: se arma el interactivo pieza por pieza según la variante.
  const interactivo = { body: { text: cuerpo } };
  if (clave !== "moderno-minimo") {
    // La 3 lleva cabecera y pie; la 2 no lleva nada de eso.
    interactivo.header = { title: "", hasMediaAttachment: false };
    interactivo.footer = { text: "sonda" };
  }
  interactivo.nativeFlowMessage = {
    buttons: boton(id).buttons,
    ...(clave === "moderno-hoja"
      ? {
          messageParamsJson: JSON.stringify({
            bottom_sheet: { in_thread_buttons_limit: 1, divider_indices: [0], list_title: "Más opciones", button_title: "Ver todo" },
          }),
        }
      : {}),
  };

  let mensaje = {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactivo),
  };

  if (clave === "plantilla") {
    mensaje = {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      templateMessage: { interactiveMessageTemplate: mensaje.interactiveMessage, templateId: `sonda-${Date.now()}` },
    };
  }

  const armado = generateWAMessageFromContent(jid, mensaje, {
    userJid: sock.user?.id,
    quoted: clave === "moderno-cita" ? citar : undefined,
    timestamp: new Date(),
  });
  if (!armado?.message) throw new Error("no se pudo armar el mensaje");

  await sock.relayMessage(jid, armado.message, {
    messageId: armado.key.id,
    additionalNodes: nodosInteractivos(jid, { contenido: armado.message }),
  });
  return armado;
}

// ── el veredicto ───────────────────────────────────────────────────────────

function diagnostico(registro) {
  const enviado = registro.enviado || {};
  const pintado = registro.pintado || {};
  const lineas = [];

  for (const v of VARIANTES) {
    const e = enviado[v.clave];
    const p = pintado[v.clave];
    const estado = !e ? "— sin enviar" : p ? `✅ SE PINTA (el toque llegó como ${p})` : "❌ NO se pintó (o no se tocó)";
    lineas.push(`${v.id}. ${v.titulo.padEnd(28)} ${estado}`);
  }

  const ok = (k) => Boolean(pintado[k]);
  let consejo;
  if (!enviado.texto) {
    consejo = "No hay datos: primero manda la sonda con *.sonda* y toca los botones que veas.";
  } else if (!ok("texto")) {
    consejo = "Ni el texto plano se pintó: el problema no es el formato del mensaje, es la conexión o la cuenta.";
  } else if (ok("moderno-completo")) {
    consejo = "La tarjeta del menú SÍ se pinta. El cartel que ves viene de otra parte (otro comando, una imagen o un chat concreto): no cambies de formato.";
  } else if (ok("moderno-minimo")) {
    consejo =
      "La tarjeta mínima se pinta y la completa no: el problema está en un adorno. " +
      "Quita primero el pie, luego la cabecera, y por último la cita, en ese orden.";
  } else if (ok("plantilla")) {
    consejo = "El formato que se pinta es el de plantilla: pon *BOTONES_FORMATO=plantilla* en el entorno.";
  } else if (ok("clasico")) {
    consejo = "El formato que se pinta es el clásico: pon *BOTONES_FORMATO=clasico* en el entorno.";
  } else if (ok("lista")) {
    consejo = "Se pinta la lista: usa menús con lista y evita las tarjetas con botones.";
  } else {
    consejo = "No se pintó ninguna tarjeta, solo el texto: quédate en texto (BOTONES=off) hasta revisar la conexión.";
  }

  return `${lineas.join("\n")}\n\n*Qué hacer*\n> ${consejo}`;
}

// ── el plugin ──────────────────────────────────────────────────────────────

let registrando = false;

export default {
  command: ["sonda", "probar-formato"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, args } = ctx;

    if (!from.endsWith("@s.whatsapp.net") && !from.endsWith("@lid")) {
      return enviartexto("「✧」 Esto va por privado: escríbeme *.sonda* en un chat contigo.");
    }

    const orden = String(args?.[0] || "").toLowerCase();

    if (orden === "reset") {
      guardar({});
      return enviartexto("「✧」 Sonda borrada. Manda *.sonda* para repetirla.");
    }

    if (orden === "fin" || orden === "resultado") {
      return enviartexto(`「✧」 *Resultado de la sonda*\n\n${diagnostico(leer())}`);
    }

    // ── lanzar la sonda ────────────────────────────────────────────────────
    guardar({ enviado: {}, pintado: {}, empezado: new Date().toISOString() });
    registrando = true;

    await enviartexto(
      "「✧」 *Sonda de formatos*\n\n" +
        "Te voy a mandar *ocho* mensajes numerados, del más simple al más adornado.\n\n" +
        "*Qué tienes que hacer:*\n" +
        "> Si un mensaje se ve bien, *toca su botón*.\n" +
        "> Si sale el cartel de «actualiza WhatsApp», *no toques nada*.\n\n" +
        "Al final escribe *.sonda fin* y te digo qué formato conviene.\n" +
        "> Los envíos van espaciados a propósito, para no disparar el anti-ban."
    );

    const errores = [];
    for (const variante of VARIANTES) {
      try {
        await enviarVariante(sock, from, variante, m);
        const datos = leer();
        datos.enviado ||= {};
        datos.enviado[variante.clave] = new Date().toISOString();
        guardar(datos);
      } catch (e) {
        errores.push(`${variante.id} (${variante.titulo}): ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, ESPERA_ENTRE_ENVIOS_MS));
    }

    registrando = false;

    const datos = leer();
    const mandados = Object.keys(datos.enviado || {}).length;
    let texto = `「✧」 Sonda enviada: *${mandados}/8*.\n> Toca los botones que veas y luego escribe *.sonda fin*.`;
    if (errores.length) texto += `\n\n⚠️ No se pudieron mandar:\n> ${errores.join("\n> ")}`;
    return enviartexto(texto);
  },

  // Aunque el comando no se ejecute (un toque no es un comando), el evento sí
  // llega: aquí se apunta qué variante se pintó y con qué tipo volvió.
  event: "messages.upsert",
  onEvent: async (_sock, ev) => {
    if (ev?.type !== "notify") return;
    const m = ev.messages?.[0];
    const msg = m?.message;
    if (!msg) return;

    const { botonPulsado } = await import("../../lib/botones.js");
    const pulsado = botonPulsado(m);
    const id = String(pulsado?.id || "").trim();
    const cual = /^sonda([1-8])$/.exec(id);
    if (!cual) return;

    const variante = VARIANTES.find((v) => v.id === Number(cual[1]));
    if (!variante) return;

    const datos = leer();
    datos.pintado ||= {};
    datos.pintado[variante.clave] = pulsado.via || "?";
    guardar(datos);

    console.log(`🧪 sonda ${variante.id} (${variante.titulo}): se pintó, el toque llegó como ${pulsado.via}`);
    void registrando;
  },
};
