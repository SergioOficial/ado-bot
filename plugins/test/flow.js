/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * .flow — tarjeta interactiva experimental, sin tocar el menú actual.
 *
 *   .flow                  panel web a pantalla completa (Flow si hay FLOW_ID)
 *   .flow demo             fuerza los botones nativos de categorías
 *   .flow web              fuerza el panel web (FLOW_WEB_URL)
 *   .flow real             fuerza el Flow publicado (necesita FLOW_ID/TOKEN)
 *   .flow cat <categoría>  comandos de una categoría
 *   .flow buscar <texto>   busca comandos por nombre
 *   .flow estado           configuración, sin enseñar el token completo
 *
 * La tarjeta lleva el texto que se ve al reenviar el mensaje:
 * «🎛️ Click aquí para abrir el menú». Ese texto es el cuerpo del mensaje; la
 * pantalla de dentro se abre con un cta_url con pistas de webview y sus nodos
 * biz/bot. El demo local es el respaldo cuando la webview no se puede enviar.
 * Ver docs/FLUJO.md.
 */
import { commands } from "../../pluginLoader.js";
import { catalogo, buscarCategoria } from "../../lib/menu-ayuda.js";
import { enviarConBotones, enviarConFlow, enviarConWebview, galaxy } from "../../lib/botones.js";
import {
  CUERPO,
  TITULO,
  PIE,
  WEB_PANEL,
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
          `▸ ${prefijo}${comando} · panel web a pantalla completa`,
          `▸ ${prefijo}${comando} demo · botones nativos de categorías`,
          `▸ ${prefijo}${comando} web · fuerza el panel web (FLOW_WEB_URL)`,
          `▸ ${prefijo}${comando} real · Flow publicado con FLOW_ID y FLOW_TOKEN`,
          `▸ ${prefijo}${comando} cat <categoría> · comandos de una categoría`,
          `▸ ${prefijo}${comando} buscar <palabra> · busca comandos`,
          `▸ ${prefijo}${comando} estado · configuración actual`,
          "",
          "No sustituye a .menu.",
        ].join("\n")
      );
    }

    const usarReal = forzarReal || (!forzarDemo && !forzarWeb && conf.listo);

    if (usarReal && !conf.listo) {
      return enviartexto(
        `No hay Flow configurado. Define FLOW_ID (o FLOW_NAME) y FLOW_TOKEN, o usa ${prefijo}${comando} web.`
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
        console.warn("⚠️  Flow no enviado, se prueba el panel web:", err?.message || err);
      }
    }

    if (!forzarDemo) {
      try {
        await enviarConWebview(sock, from, {
          texto: CUERPO,
          url: conf.web || WEB_PANEL,
          cita: m,
        });
        return;
      } catch (err) {
        console.warn("⚠️  Webview no enviada, se manda la demo:", err?.message || err);
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
