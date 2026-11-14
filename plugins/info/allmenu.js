/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .allmenu   todos los comandos agrupados por categoría (la lista completa)
 * .menucat   solo los nombres de las categorías
 *
 * Se genera leyendo los plugins cargados, no una lista escrita a mano: si un
 * comando se borra, desaparece del menú; si se añade, sale solo.
 */
import { readdirSync } from "fs";
import { join } from "path";

/** Mapa «carpeta de plugins → título y emoji» para que la lista se lea. */
const TITULOS = {
  admin: "🛡️ ADMIN",
  descargas: "🎄 DESCARGAS",
  economia: "💰 ECONOMÍA",
  fun: "🎉 DIVERSIÓN",
  gacha: "🎴 GACHA",
  ia: "🧠 IA",
  info: "ℹ️ INFO",
  owner: "👑 OWNER",
  perfil: "🧾 PERFIL",
  premium: "💎 PREMIUM",
  rpg: "⚔️ RPG",
  stickers: "🖌️ STICKERS",
  subbots: "🤖 SUB-BOTS",
  test: "🧪 TEST",
  utils: "🔔 UTILIDADES",
};

function porCategoria() {
  const raiz = join(process.cwd(), "plugins");
  const salida = {};
  for (const carpeta of readdirSync(raiz)) {
    let archivos;
    try {
      archivos = readdirSync(join(raiz, carpeta)).filter((f) => f.endsWith(".js"));
    } catch {
      continue; // no es una carpeta
    }
    salida[carpeta] = archivos.map((f) => f.replace(/\.js$/, "")).sort();
  }
  return salida;
}

export default {
  command: ["allmenu", "comandos", "menucat", "categorias"],
  execute: async (ctx) => {
    const { comando, enviartexto, PREFIX, config } = ctx;
    const categorias = porCategoria();
    const nombres = Object.keys(categorias).sort();

    if (comando === "menucat" || comando === "categorias") {
      const total = Object.values(categorias).reduce((n, l) => n + l.length, 0);
      return enviartexto(
        `📂 *Categorías* (${nombres.length})\n\n` +
          nombres.map((c) => `│ ${TITULOS[c] || c} — *${categorias[c].length}*`).join("\n") +
          `\n╰─\n\n> *${total}* archivos de comando en total.\n> Ver una: *${PREFIX}menu ${nombres[0] || "utils"}*\n> Ver todo: *${PREFIX}allmenu*`
      );
    }

    const partes = [`📚 *Todos los comandos*`, `> Prefijo: ${PREFIX}`, ""];
    for (const c of nombres) {
      partes.push(`*${TITULOS[c] || c}*`);
      partes.push(categorias[c].map((n) => `${PREFIX}${n}`).join(" · "));
      partes.push("");
    }
    partes.push(`> ${config.footer}`);

    const texto = partes.join("\n");
    if (texto.length > 3500) {
      // Un mensaje de WhatsApp no aguanta una lista enorme: se manda el
      // resumen y se pide la categoría concreta.
      return enviartexto(
        `📚 La lista completa pasa de un mensaje.\n> Mira las categorías con *${PREFIX}menucat* y luego *${PREFIX}menu <categoría>*.\n> Ejemplo: *${PREFIX}menu admin*`
      );
    }
    return enviartexto(texto);
  },
};
