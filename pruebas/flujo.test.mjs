/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/flujo.test.mjs — comprueba .flow sin abrir WhatsApp.
 */
import { igual, esVerdad, lanza } from "./ayuda.mjs";
import {
  CUERPO,
  TITULO,
  configuracion,
  parametrosGalaxy,
  botonesLocales,
  textoLocal,
  textoCategoria,
  textoEstado,
  buscar,
} from "../lib/flujo.js";

const categorias = [
  { titulo: "Subbots", emoji: "🤖", descripcion: "Vinculación del bot" },
  { titulo: "Grupo", emoji: "👥", descripcion: "Ajustes del grupo" },
  { titulo: "Admin", emoji: "🛡️", descripcion: "Herramientas" },
  { titulo: "Descargas", emoji: "📥", descripcion: "Medios" },
];

const grupos = [
  {
    titulo: "Test",
    carpeta: "test",
    comandos: [{ nombre: "flow", alias: [] }, { nombre: "buttons", alias: ["botones"] }],
  },
  {
    titulo: "Stickers",
    carpeta: "stickers",
    comandos: [{ nombre: "stickeraudio", alias: ["sa"] }],
  },
];

export const pruebas = [
  ["el cuerpo coincide con el texto buscado", () => {
    igual(CUERPO, "🎛️ Click aquí para abrir el menú", "cuerpo");
    igual(TITULO, "🎛️ Menú", "encabezado");
    esVerdad(textoLocal(categorias).startsWith(CUERPO), "el respaldo empieza igual");
  }],

  ["sin configuración queda en demo local", () => {
    const conf = configuracion({});
    igual(conf.listo, false, "no listo");
    igual(conf.token, "unused", "token por defecto");
    igual(conf.modo, "published", "modo");
    lanza(() => parametrosGalaxy(conf), "sin id debe fallar");
  }],

  ["con flow publicado se arma galaxy_message", () => {
    const conf = configuracion({
      FLOW_ID: "123456789",
      FLOW_TOKEN: "abc.def",
      FLOW_CTA: "Abrir menú",
      FLOW_PANTALLA: "MENU",
      FLOW_DATOS: '{"origen":"chat"}',
    });
    const p = JSON.parse(parametrosGalaxy(conf));

    igual(p.flow_id, "123456789", "id");
    igual(p.flow_name, undefined, "no lleva nombre si hay id");
    igual(p.flow_message_version, "3", "versión");
    igual(p.flow_token, "abc.def", "token");
    igual(p.flow_cta, "Abrir menú", "cta");
    igual(p.flow_action_payload.screen, "MENU", "pantalla");
    igual(p.flow_action_payload.data.origen, "chat", "datos iniciales");
  }],

  ["el id y el nombre son excluyentes", () => {
    const conf = configuracion({ FLOW_ID: "1", FLOW_NAME: "menu", FLOW_TOKEN: "t" });
    const p = JSON.parse(parametrosGalaxy(conf));
    igual(p.flow_id, "1", "id");
    igual("flow_name" in p, false, "sin nombre");
  }],

  ["la cta pierde emoji y se corta a 30 caracteres", () => {
    const conf = configuracion({ FLOW_NAME: "menu", FLOW_CTA: "🎛️ Abre el menú interactivo de pruebas largo" });
    igual(conf.cta.includes("🎛"), false, "sin emoji");
    esVerdad(conf.cta.length <= 30, "largo máximo");
    igual(conf.id, null, "sin id");
    igual(conf.nombre, "menu", "nombre");
  }],

  ["los botones de la demo son comandos reales", () => {
    const botones = botonesLocales(categorias, 2);
    igual(botones.length, 4, "dos categorías + lista + buscador");
    const id = JSON.parse(botones[0].buttonParamsJson).id;
    igual(id, "flow cat Subbots", "id de categoría");
    igual(botones[2].name, "single_select", "lista de categorías");
    const filas = JSON.parse(botones[2].buttonParamsJson).sections[0].rows;
    igual(filas.length, 4, "todas las categorías en la lista");
    igual(JSON.parse(botones[3].buttonParamsJson).id, "flow buscar ", "buscador");
  }],

  ["el buscador encuentra alias y respeta el límite", () => {
    igual(buscar(grupos, "BOTONES")[0].nombre, "buttons", "sin acentos ni mayúsculas");
    igual(buscar(grupos, "audio")[0].nombre, "stickeraudio", "otra categoría");
    igual(buscar(grupos, "  "), [], "sin término");
    igual(buscar(grupos, "flow").length, 1, "sin duplicados");
  }],

  ["la categoría y el estado se pueden leer", () => {
    esVerdad(textoCategoria(grupos[1], "#").includes("#stickeraudio"), "prefijo del bot");
    const texto = textoEstado(configuracion({ FLOW_ID: "123456789", FLOW_TOKEN: "abcdef123456" }));
    esVerdad(texto.includes("abcd…"), "token enmascarado");
    igual(texto.includes("abcdef123456"), false, "token completo nunca");
  }],
];
