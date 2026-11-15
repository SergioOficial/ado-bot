/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/compuerta.js — la puerta de entrada de los mensajes.
 *
 * Aquí se decide UNA sola cosa: ¿este mensaje entrante es un comando que me
 * toca atender? Nada más. No se envía nada, no se toca la base, no se habla con
 * WhatsApp; por eso se puede probar sin abrir una sesión.
 *
 * Salió de `index.js` porque allí creció hasta romperse. Lo que había era un
 * bloque anti-bucle a medio escribir: le faltaba la llave que lo cerraba (el
 * archivo no compilaba y el bot no arrancaba) y comparaba el texto propio con
 * `PREFIX`, una variable que en ese ámbito no existe. Las dos cosas mataban el
 * proceso en cuanto entraba un mensaje marcado como propio: el manejador es
 * asíncrono y va enganchado a un evento, así que el `ReferenceError` salía como
 * rechazo no manejado y Node apaga el proceso. De ahí el «un bot pone un
 * comando y se cae el servidor».
 *
 * La regla de fondo, que es la que evita el eco:
 *
 *   · Un mensaje con `fromMe` salió de esta misma cuenta. Si el bot se hiciera
 *     caso a sí mismo, cada respuesta que empiece con un prefijo volvería a
 *     entrar como comando y el bucle no pararía nunca. Se descarta siempre.
 *   · Lo que sí se atiende es el comando escrito por OTRA cuenta: el sub-bot ve
 *     el mensaje del bot principal como uno ajeno, y al revés. Ese es el camino
 *     correcto del multi-bot y no se toca.
 *   · Para el eco entre dos cuentas distintas (A manda, B responde citando, A
 *     vuelve a mandar) está `lib/bucles.js`, que mira la huella del comando y el
 *     mensaje citado. Son dos problemas distintos y se resuelven aparte.
 */

import { botonPulsado } from "./botones.js";

/** Motivos de rechazo. Van en el registro para saber qué se está filtrando. */
export const MOTIVOS = {
  VACIO: "mensaje vacío",
  PROPIO: "mensaje propio (fromMe)",
  SIN_TEXTO: "no trae texto ni botón",
  SIN_PREFIJO: "no empieza con ningún prefijo y no es un comando conocido",
  SIN_COMANDO: "no queda comando después del prefijo",
};

const no = (motivo) => ({ pasa: false, motivo });

/**
 * El texto que podría llevar un comando, en el orden en que WhatsApp lo guarda.
 * Devuelve `null` si el mensaje no trae nada escribible (solo foto, solo audio,
 * un sticker, una reacción…).
 */
export function textoDelMensaje(m) {
  const msg = m?.message;
  if (!msg || typeof msg !== "object") return null;

  const directo =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    null;

  if (directo != null && String(directo).length) return String(directo);

  // Sin texto puede haber botón: la fila pulsada trae el comando en su id.
  const pulsado = botonPulsado(m);
  if (pulsado?.id) return String(pulsado.id).trim();

  return null;
}

/** ¿El mensaje lo mandó esta misma cuenta? */
export function esMensajePropio(m) {
  return Boolean(m?.key?.fromMe);
}

/**
 * ¿Es un comando escrito sin prefijo? Solo se acepta si el texto completo es un
 * comando conocido y tiene una forma razonable (sin saltos de línea, sin
 * símbolos raros). Así «menu» funciona a secas, pero una frase cualquiera que
 * empiece igual no dispara nada.
 *
 * `conoce` recibe el comando en minúsculas y dice si existe. Se pasa desde fuera
 * (el cargador de plugins) para que este módulo no dependa de él.
 */
export function esComandoSinPrefijo(texto, conoce) {
  if (typeof conoce !== "function") return false;
  const limpio = String(texto || "").trim().toLowerCase();
  if (!limpio || limpio.length > 42) return false;
  if (!/^[a-z0-9][a-z0-9 _-]{1,40}$/.test(limpio)) return false;
  return Boolean(conoce(limpio));
}

/**
 * La compuerta.
 *
 * @param {object} m                    mensaje tal cual lo entrega `messages.upsert`
 * @param {object} opciones
 * @param {string[]} opciones.prefijos          prefijos aceptados, en orden
 * @param {function} [opciones.conoce]          ¿existe este comando?
 * @param {string}   [opciones.prefijoBoton]    prefijo que se le pone al id de un botón
 * @returns {{pasa:boolean, motivo?:string, texto?:string, prefijo?:string, comando?:string, args?:string[], deBoton?:boolean, boton?:object}}
 *
 * Nunca lanza: un mensaje con la forma que sea tiene que dar un «no pasa» y
 * seguir, no tirar el proceso.
 */
export function compuerta(m, { prefijos = [], conoce, prefijoBoton = prefijos[0] || "." } = {}) {
  try {
    if (!m || typeof m !== "object") return no(MOTIVOS.VACIO);
    if (!m.message || typeof m.message !== "object") return no(MOTIVOS.VACIO);
    if (esMensajePropio(m)) return no(MOTIVOS.PROPIO);

    const pulsado = botonPulsado(m);
    const deBoton = Boolean(pulsado?.id);

    let texto = textoDelMensaje(m);
    if (texto == null || !texto.length) return no(MOTIVOS.SIN_TEXTO);

    // El id de un botón puede venir ya con prefijo (así lo fabrica
    // lib/botones.js con `usarPrefijoBotones`) o sin él. Se normaliza al
    // segundo caso para que el resto del camino sea uno solo.
    if (deBoton && !empiezaCon(texto, prefijos)) {
      texto = `${prefijoBoton}${texto.trim()}`;
    }

    const prefijo = prefijos.find((p) => empiezaCon(texto, [p]));

    if (prefijo !== undefined) {
      const resto = texto.slice(prefijo.length).trim();
      if (!resto) return no(MOTIVOS.SIN_COMANDO);

      const partes = resto.split(/\s+/).filter(Boolean);
      const comando = (partes.shift() || "").toLowerCase();
      if (!comando) return no(MOTIVOS.SIN_COMANDO);

      return { pasa: true, texto, prefijo, comando, args: partes, deBoton, boton: pulsado || null };
    }

    // Sin prefijo: solo si el texto entero ES un comando conocido.
    if (esComandoSinPrefijo(texto, conoce)) {
      return {
        pasa: true,
        texto,
        prefijo: "",
        comando: texto.trim().toLowerCase(),
        args: [],
        deBoton,
        boton: pulsado || null,
      };
    }

    return no(MOTIVOS.SIN_PREFIJO);
  } catch (err) {
    // Llegar aquí ya es un fallo nuestro, no del mensaje. Se descarta y se dice.
    return no(`error en la compuerta: ${err?.message || err}`);
  }
}

function empiezaCon(texto, prefijos) {
  return (prefijos || []).some((p) => typeof p === "string" && p.length > 0 && texto.startsWith(p));
}

export default { compuerta, textoDelMensaje, esMensajePropio, esComandoSinPrefijo, MOTIVOS };
