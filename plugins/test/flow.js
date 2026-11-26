/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * .flow — tarjeta interactiva experimental, sin tocar el menú actual.
 *
 *   .flow                  tarjeta del Flow publicado, o la variante disponible
 *   .flow demo             fuerza la demo local (categorías y buscador)
 *   .flow web              abre el panel web dentro de WhatsApp (FLOW_WEB_URL)
 *   .flow real             fuerza el Flow publicado (necesita FLOW_ID/TOKEN)
 *   .flow cat <categoría>  comandos de una categoría
 *   .flow buscar <texto>   busca comandos por nombre
 *   .flow estado           configuración, sin enseñar el token completo
 *
 * La tarjeta lleva el texto que se ve al reenviar el mensaje:
 * «🎛️ Click aquí para abrir el menú». Ese texto es el cuerpo del mensaje; la
 * interfaz de dentro solo existe si hay un Flow publicado en WhatsApp Manager.
 *
 * Ni la demo local ni el panel web son un Flow de Meta: son botones nativos con
 * forma parecida. Sirven para probar el envío sin cuenta business. Ver
 * docs/FLUJO.md.
 */
import { commands } from "../../pluginLoader.js";
import { catalogo, buscarCategoria } from "../../lib/menu-ayuda.js";
import { enviarConBotones, enviarConFlow, galaxy, webview } from "../../lib/botones.js";
import {
  CUERPO,
  TITULO,
  PIE,
  configuracion,
  parametrosGalaxy,
  botonesLocales,
  textoCategoria,
  textoEstado,
  buscar,
} from "../../lib/flujo.js";

/** Las categorías tal como las conoce el menú, sin duplicarlas aquí. */
function gruposDelMenu() {
  return catalogo(commands);
}

function categoriasDe(grupos) {
  return grupos.map((g) => ({ titulo: g.titulo, emoji: g.emoji, descripcion: g.descripcion }));
}

export default {
  command: "flow",
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, PREFIX, comando } = ctx;
    const prefijo = PREFIX || ".";
    const modo = (args[0] || "").toLowerCase();
    const conf = configuracion();
    const grupos = gruposDelMenu();
    const forzarDemo = ["demo", "local", "prueba", "test"].includes(modo);
    const forzarReal = ["real", "flow", "publicado"].includes(modo);
    const forzarWeb = ["web", "panel", "sitio"].includes(modo);

    if (modo === "estado") {
      return enviartexto(textoEstado(conf));
    }

    if (forzarWeb || (!forzarDemo && !forzarReal && !conf.listo && conf.web)) {
      if (!conf.web) {
        return enviartexto(
          `Define FLOW_WEB_URL con la URL HTTPS del panel, o usa ${prefijo}${comando} demo.`
        );
      }
      return enviarConBotones(sock, from, {
        texto: CUERPO,
        titulo: TITULO,
        pie: PIE,
        imagen: conf.imagen || undefined,
        botones: [webview("Abrir menú", conf.web, true)],
        cita: m,
      });
    }

    if (modo === "cat" || modo === "categoria" || modo === "categoría") {
      const nombre = args.slice(1).join(" ").trim();
      if (!nombre) {
        return enviartexto(`Escribe ${prefijo}${comando} cat <categoría>. Por ejemplo: ${prefijo}${comando} cat Test.`);
      }
      return enviartexto(textoCategoria(buscarCategoria(grupos, nombre), prefijo));
    }

    if (modo === "buscar" || modo === "search") {
      const termino = args.slice(1).join(" ").trim();
      if (!termino) {
        return enviartexto(`Escribe ${prefijo}${comando} buscar <palabra>.`);
      }
      const hallados = buscar(grupos, termino);
      if (!hallados.length) return enviartexto(`Sin resultados para «${termino}».`);
      return enviartexto(
        [`*Resultados para «${termino}»*`, "", ...hallados.map((r) => `▸ ${prefijo}${r.nombre} · ${r.categoria}`)].join("\n")
      );
    }

    if (modo === "ayuda" || modo === "help") {
      return enviartexto(
        [
          "*Menú interactivo experimental*",
          "",
          `▸ ${prefijo}${comando} · tarjeta del Flow (o demo local)`,
          `▸ ${prefijo}${comando} demo · categorías y buscador sin WABA`,
          `▸ ${prefijo}${comando} web · panel web dentro de WhatsApp con FLOW_WEB_URL`,
          `▸ ${prefijo}${comando} real · Flow publicado con FLOW_ID y FLOW_TOKEN`,
          `▸ ${prefijo}${comando} cat <categoría> · comandos de una categoría`,
          `▸ ${prefijo}${comando} buscar <palabra> · busca comandos`,
          `▸ ${prefijo}${comando} estado · configuración actual`,
          "",
          "No sustituye a .menu.",
        ].join("\n")
      );
    }

    const usarReal = forzarReal || (!forzarDemo && conf.listo);

    if (usarReal && !conf.listo) {
      return enviartexto(
        `No hay Flow configurado. Define FLOW_ID (o FLOW_NAME) y FLOW_TOKEN, o usa ${prefijo}${comando} demo.`
      );
    }

    if (usarReal) {
      try {
        await enviarConFlow(sock, from, {
          texto: CUERPO,
          titulo: TITULO,
          pie: PIE,
          boton: galaxy(parametrosGalaxy(conf)),
          cita: m,
        });
        return;
      } catch (err) {
        console.warn("⚠️  Flow no enviado, se manda la demo:", err?.message || err);
      }
    }

    const categorias = categoriasDe(grupos);
    const botones = botonesLocales(categorias);
    await enviarConBotones(sock, from, {
      texto: CUERPO,
      titulo: TITULO,
      pie: PIE,
      imagen: conf.imagen || undefined,
      botones,
      cita: m,
      hoja: { titulo: "Categorías", boton: "Ver todo" },
    });
  },
};
