/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/compuerta.test.mjs — la puerta de entrada, medida.
 *
 * Cubre sobre todo los casos que tiraban el proceso: `fromMe` con cuerpo sin
 * texto, mensajes de protocolo, botones con JSON roto y basura por entrada.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { compuerta, textoDelMensaje, esMensajePropio, esComandoSinPrefijo, MOTIVOS } from "../lib/compuerta.js";

const PREFIJOS = [".", "#", "/", "🇨🇺"];
const CONOCE = (nombre) => ["menu", "ping", "adoptar", "jadibot", "rw"].includes(nombre);

/** Mensaje de texto plano, como lo entrega `messages.upsert`. */
function texto(t, { fromMe = false, jid = "123@g.us", id = "ABC" } = {}) {
  return { key: { remoteJid: jid, fromMe, id, participant: "5358090650@s.whatsapp.net" }, message: { conversation: t } };
}

/** Botón pulsado (native flow), que es como se pide un comando con la lista. */
function boton(id, { paramsJson } = {}) {
  return {
    key: { remoteJid: "123@g.us", fromMe: false, id: "BTN" },
    message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: { paramsJson: paramsJson ?? JSON.stringify({ id }), name: "single_select" },
      },
    },
  };
}

const abrir = (m) => compuerta(m, { prefijos: PREFIJOS, conoce: CONOCE, prefijoBoton: PREFIJOS[0] });

export const pruebas = [
  ["un comando normal pasa y se parte bien", () => {
    const r = abrir(texto(".menu rpg extra"));
    igual(r.pasa, true, "pasa");
    igual(r.prefijo, ".", "prefijo");
    igual(r.comando, "menu", "comando");
    igual(r.args, ["rpg", "extra"], "argumentos");
    igual(r.deBoton, false, "no es botón");
  }],

  ["cualquiera de los prefijos sirve", () => {
    igual(abrir(texto("#ping")).comando, "ping", "numeral");
    igual(abrir(texto("/ping")).comando, "ping", "barra");
    igual(abrir(texto("🇨🇺ping")).comando, "ping", "bandera");
    igual(abrir(texto("🇨🇺ping")).prefijo, "🇨🇺", "el prefijo emoji se recorta entero");
  }],

  ["el comando sale en minúsculas", () => {
    igual(abrir(texto(".MENU RPG")).comando, "menu", "comando");
    igual(abrir(texto(".MENU RPG")).args, ["RPG"], "los argumentos conservan su forma");
  }],

  ["un mensaje propio (fromMe) se descarta siempre", () => {
    const r = abrir(texto(".menu", { fromMe: true }));
    igual(r.pasa, false, "no pasa");
    igual(r.motivo, MOTIVOS.PROPIO, "motivo");
  }],

  ["un mensaje propio descarta aunque no traiga texto", () => {
    // Este es el caso que tiraba el proceso: fromMe con un cuerpo sin
    // `conversation` (protocolo, reacción, estado). Antes se leía el texto
    // antes de mirar si existía.
    const r = abrir({ key: { remoteJid: "1@s.whatsapp.net", fromMe: true, id: "X" }, message: { protocolMessage: { type: 0 } } });
    igual(r.pasa, false, "no pasa");
  }],

  ["lo que no trae mensaje se descarta", () => {
    igual(abrir({ key: { remoteJid: "1@g.us" } }).pasa, false, "sin message");
    igual(abrir(null).pasa, false, "nulo");
    igual(abrir(undefined).pasa, false, "indefinido");
    igual(abrir({}).pasa, false, "objeto vacío");
    igual(abrir({ key: {}, message: {} }).motivo, MOTIVOS.SIN_TEXTO, "cuerpo vacío");
  }],

  ["un mensaje de protocolo no dispara nada", () => {
    igual(abrir({ key: { remoteJid: "1@g.us" }, message: { protocolMessage: { type: 0 } } }).pasa, false, "protocolo");
    igual(abrir({ key: { remoteJid: "1@g.us" }, message: { reactionMessage: { text: "👍" } } }).pasa, false, "reacción");
    igual(abrir({ key: { remoteJid: "1@g.us" }, message: { stickerMessage: { url: "x" } } }).pasa, false, "sticker suelto");
  }],

  ["el texto sale de donde WhatsApp lo guarda", () => {
    igual(textoDelMensaje({ message: { conversation: "a" } }), "a", "conversation");
    igual(textoDelMensaje({ message: { extendedTextMessage: { text: "b" } } }), "b", "extendedText");
    igual(textoDelMensaje({ message: { imageMessage: { caption: "c" } } }), "c", "foto con leyenda");
    igual(textoDelMensaje({ message: { videoMessage: { caption: "d" } } }), "d", "video con leyenda");
    igual(textoDelMensaje({ message: { imageMessage: {} } }), null, "foto sin leyenda");
  }],

  ["una frase sin prefijo no es un comando", () => {
    const r = abrir(texto("hola a todos"));
    igual(r.pasa, false, "no pasa");
    igual(r.motivo, MOTIVOS.SIN_PREFIJO, "motivo");
  }],

  ["un comando conocido sin prefijo sí pasa", () => {
    const r = abrir(texto("menu"));
    igual(r.pasa, true, "pasa");
    igual(r.prefijo, "", "sin prefijo");
    igual(r.comando, "menu", "comando");
    igual(r.args, [], "sin argumentos");
  }],

  ["sin prefijo no se aceptan argumentos sueltos", () => {
    // «menu rpg» a secas no es el comando `menu rpg`: es una frase. Si se
    // aceptara, cualquier texto que empiece con un nombre de comando dispararía.
    igual(abrir(texto("menu rpg")).pasa, false, "frase que empieza con comando");
    igual(abrir(texto("ping")).pasa, true, "el comando solo sí");
  }],

  ["un comando desconocido sin prefijo no pasa", () => {
    igual(abrir(texto("asdfgh")).pasa, false, "no existe");
    igual(esComandoSinPrefijo("menu", CONOCE), true, "conocido");
    igual(esComandoSinPrefijo("noexiste", CONOCE), false, "desconocido");
    igual(esComandoSinPrefijo("menu", null), false, "sin validador no se acepta nada");
    igual(esComandoSinPrefijo("menu\nrm -rf /", CONOCE), false, "con salto de línea no");
  }],

  ["un prefijo solo no es un comando", () => {
    igual(abrir(texto(".")).pasa, false, "punto suelto");
    igual(abrir(texto(".   ")).pasa, false, "punto y espacios");
    igual(abrir(texto("#")).pasa, false, "numeral suelto");
  }],

  ["un botón pulsado se convierte en comando", () => {
    const r = abrir(boton("menu rpg"));
    igual(r.pasa, true, "pasa");
    igual(r.deBoton, true, "viene de botón");
    igual(r.comando, "menu", "comando");
    igual(r.args, ["rpg"], "argumentos");
    igual(r.boton?.via, "nativa", "se sabe por dónde entró");
  }],

  ["un botón con el prefijo puesto no lo duplica", () => {
    const r = abrir(boton(".menu"));
    igual(r.comando, "menu", "comando");
    igual(r.prefijo, ".", "prefijo");
  }],

  ["un botón con JSON roto no tira nada", () => {
    const r = abrir(boton(null, { paramsJson: "{roto" }));
    igual(r.pasa, false, "no pasa y no lanza");
  }],

  ["la compuerta no lanza con basura por entrada", () => {
    const raros = [
      null, undefined, 0, "", [], {}, { key: null }, { message: null },
      { key: { remoteJid: null }, message: { conversation: null } },
      { key: { remoteJid: "x" }, message: { conversation: 42 } },
      { key: { remoteJid: "x" }, message: { conversation: { raro: true } } },
      { key: { remoteJid: "x", fromMe: "sí" }, message: { conversation: ".menu" } },
      { key: {}, message: { extendedTextMessage: {} } },
    ];
    for (const raro of raros) {
      const r = abrir(raro);
      esVerdad(r && typeof r.pasa === "boolean", `respuesta con forma para ${JSON.stringify(raro) ?? String(raro)}`);
      igual(r.pasa, false, "la basura no pasa");
    }
  }],

  ["prefijos vacíos o raros no rompen nada", () => {
    igual(compuerta(texto(".menu"), { prefijos: [], conoce: CONOCE }).pasa, false, "sin prefijos configurados");
    igual(compuerta(texto(".menu"), { prefijos: ["", null, "."], conoce: CONOCE }).comando, "menu", "salta los prefijos vacíos");
    igual(compuerta(texto("menu"), {}).pasa, false, "sin validador ni prefijo");
  }],

  ["esMensajePropio solo mira la bandera", () => {
    igual(esMensajePropio({ key: { fromMe: true } }), true, "propio");
    igual(esMensajePropio({ key: { fromMe: false } }), false, "ajeno");
    igual(esMensajePropio({}), false, "sin key");
    igual(esMensajePropio(null), false, "nulo");
  }],
];
