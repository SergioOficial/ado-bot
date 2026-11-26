/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/flujo.js — piezas puras del comando .flow.
 *
 * Aquí no se habla con WhatsApp ni se lee la base de datos: solo se arman
 * textos, botones y parámetros. Por eso se puede probar sin abrir una sesión.
 */

/** Texto del mensaje, tal como se ve al reenviar la tarjeta. */
export const CUERPO = "🎛️ Click aquí para abrir el menú";

/** Encabezado de la tarjeta. */
export const TITULO = "🎛️ Menú";

/** Pie de la tarjeta. */
export const PIE = "Menú interactivo · experimental";

/** Texto que se muestra dentro del.flow publicado. */
export const DESCRIPCION = "Elige una categoría, busca o toca un comando para ver los detalles";

/** Límite de resultados del buscador local. */
export const LIMITE_RESULTADOS = 12;

/**
 * Lee la configuración del Flow desde el entorno.
 *
 * FLOW_ID y FLOW_TOKEN son los que entrega WhatsApp Manager para un Flow
 * publicado. FLOW_NAME es una alternativa al id (no se pueden usar juntos).
 *
 * @param {object} entorno
 * @returns {{id:string|null, nombre:string|null, token:string, cta:string, pantalla:string, modo:string, datos:object|null, imagen:string|null, listo:boolean}}
 */
export function configuracion(entorno = process.env) {
  const id = String(entorno.FLOW_ID || "").trim();
  const nombre = String(entorno.FLOW_NAME || "").trim();
  const datosCrudos = String(entorno.FLOW_DATOS || "").trim();
  let datos = null;

  if (datosCrudos) {
    try {
      const parseado = JSON.parse(datosCrudos);
      if (parseado && typeof parseado === "object" && !Array.isArray(parseado)) datos = parseado;
    } catch {
      datos = null;
    }
  }

  const ctaOriginal = String(entorno.FLOW_CTA || "Abrir menú").trim() || "Abrir menú";
  // La CTA no admite emoji y Meta recomienda 30 caracteres o menos.
  const cta = Array.from(ctaOriginal)
    .filter((caracter) => !/\p{Extended_Pictographic}|\p{Emoji_Modifier}/u.test(caracter))
    .join("")
    .trim()
    .slice(0, 30) || "Abrir menú";

  return {
    id: id || null,
    nombre: id ? null : nombre || null,
    token: String(entorno.FLOW_TOKEN || "unused").trim() || "unused",
    cta,
    pantalla: String(entorno.FLOW_PANTALLA || "MENU").trim() || "MENU",
    modo: String(entorno.FLOW_MODO || "published").toLowerCase() === "draft" ? "draft" : "published",
    datos,
    imagen: String(entorno.FLOW_IMAGEN || "").trim() || null,
    listo: Boolean(id || nombre),
  };
}

/**
 * Parámetros del botón `galaxy_message` de un Flow publicado.
 * Es el mismo contenido que la API de WhatsApp envía en
 * `interactive.action.parameters`, pero en el formato nativo que usa Baileys.
 *
 * @param {object} conf resultado de configuracion()
 * @returns {string} JSON de los parámetros, listo para lib/botones.js
 */
export function parametrosGalaxy(conf) {
  if (!conf?.listo) throw new Error("Falta FLOW_ID o FLOW_NAME");

  const parameters = {
    mode: conf.modo,
    flow_message_version: "3",
    flow_token: conf.token,
    flow_cta: conf.cta,
    flow_action: "navigate",
    flow_action_payload: {
      screen: conf.pantalla,
    },
  };

  if (conf.id) parameters.flow_id = conf.id;
  else parameters.flow_name = conf.nombre;

  if (conf.datos) parameters.flow_action_payload.data = conf.datos;

  return JSON.stringify(parameters);
}

/**
 * Botones del modo local: imita las categorías visibles en la captura sin
 * necesitar una cuenta business ni un Flow publicado.
 *
 * Los ids son comandos reales del bot: la compuerta los convierte en
 * `.flow cat ...` o `.flow buscar ...` cuando se tocan.
 *
 * @param {Array<{titulo:string, emoji?:string}>} categorias
 * @param {number} [visibles]
 */
export function botonesLocales(categorias = [], visibles = 3) {
  const limpias = categorias.filter(Boolean).slice(0, Math.max(0, visibles));
  const botones = limpias.map((c) => ({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: `${c.emoji || "▸"} ${c.titulo}`,
      id: `flow cat ${c.titulo}`,
    }),
  }));

  if (categorias.length > visibles) {
    const filas = categorias.map((c) => ({
      id: `flow cat ${c.titulo}`,
      title: `${c.emoji || "▸"} ${c.titulo}`,
      description: c.descripcion || "",
    }));
    botones.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Categorías",
        sections: [{ title: "Menú interactivo", rows: filas }],
      }),
    });
  }

  botones.push({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: "🔎 Buscar comando",
      id: "flow buscar ",
    }),
  });

  return botones;
}

/** Texto de respaldo: lo que se ve cuando el cliente no pinta tarjetas. */
export function textoLocal(categorias = []) {
  const lineas = categorias.map((c) => `▸ ${c.emoji || "▸"} ${c.titulo} → .flow cat ${c.titulo}`);
  return [
    CUERPO,
    "",
    DESCRIPCION,
    "",
    ...lineas,
    "▸ 🔎 Buscar → .flow buscar <palabra>",
    "",
    "Este menú es una prueba: no sustituye a .menu.",
  ].join("\n");
}

/**
 * Busca comandos en el catálogo ya armado por lib/menu-ayuda.js.
 *
 * @param {Array<{titulo:string, comandos:Array<{nombre:string, alias:string[]}>}>} grupos
 * @param {string} termino
 * @returns {Array<{nombre:string, categoria:string}>}
 */
export function buscar(grupos = [], termino = "") {
  let aguja = String(termino || "").trim().toLowerCase();
  if ([".", "!", "/", "#"].includes(aguja[0])) aguja = aguja.slice(1);
  if (!aguja) return [];

  const encontrados = [];
  for (const grupo of grupos) {
    for (const c of grupo.comandos || []) {
      const nombres = [c.nombre, ...(c.alias || [])].map((n) => String(n).toLowerCase());
      if (nombres.some((n) => n.includes(aguja))) {
        encontrados.push({ nombre: nombres[0], categoria: grupo.titulo || grupo.carpeta || "" });
      }
    }
  }

  const vistos = new Set();
  return encontrados
    .filter((r) => {
      if (vistos.has(r.nombre)) return false;
      vistos.add(r.nombre);
      return true;
    })
    .slice(0, LIMITE_RESULTADOS);
}

/** Texto de una categoría concreta, para los chips del menú local. */
export function textoCategoria(grupo, prefijo = ".") {
  if (!grupo) return "No hay esa categoría en el menú.";
  const p = String(prefijo || ".").trim() || ".";
  const lineas = (grupo.comandos || []).map((c) => `▸ ${p}${c.nombre}`);
  return [`*${grupo.titulo || grupo.carpeta}*`, grupo.descripcion || "", "", ...lineas].filter(Boolean).join("\n");
}

/** Estado de la configuración, sin enseñar el token completo. */
export function textoEstado(conf) {
  const token = conf.token === "unused" ? "unused" : `${conf.token.slice(0, 4)}…`;
  return [
    "*Estado de .flow*",
    `> Modo configurado: ${conf.listo ? "Flow publicado" : "demo local"}`,
    `> Identificador: ${conf.id || conf.nombre || "sin definir"}`,
    `> Token: ${token}`,
    `> CTA: ${conf.cta}`,
    `> Pantalla: ${conf.pantalla}`,
    `> Modo: ${conf.modo}`,
    "",
    "Variables: FLOW_ID (o FLOW_NAME), FLOW_TOKEN, FLOW_CTA, FLOW_PANTALLA, FLOW_MODO, FLOW_DATOS, FLOW_IMAGEN.",
  ].join("\n");
}
