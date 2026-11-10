/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .crypto <btc|eth|…>        precio ahora, en dólares y en pesos
 * .letra <artista> <título>  letra de la canción
 *
 * Las dos APIs se probaron antes de escribir esto (CoinGecko y lyrics.ovh
 * responden y devuelven datos reales). Si un día no responden, el comando dice
 * cuál es el problema en vez de mostrar un precio inventado: un precio viejo
 * hace que la gente compre mal.
 */
import { precioCripto, letraCancion, MONEDAS } from "../../lib/consultas.js";

const MAX_LETRA = 3200;

export default {
  command: ["crypto", "btc", "precio", "letra", "lyrics", "lyric"],
  execute: async (ctx) => {
    const { args, comando, enviartexto, PREFIX } = ctx;

    // ── precio ────────────────────────────────────────────────────────────
    if (comando === "crypto" || comando === "btc" || comando === "precio") {
      const cual = args[0] || "btc";
      await enviartexto("⏳ Consultando el precio…");
      try {
        const p = await precioCripto(cual);
        const cambio =
          p.cambio24 === null
            ? "sin dato de 24 h"
            : `${p.cambio24 >= 0 ? "▲" : "▼"} ${Math.abs(p.cambio24).toFixed(2)} % en 24 h`;
        const pesos = p.mxn
          ? `│ En pesos › *$${p.mxn.toLocaleString("es-MX", { maximumFractionDigits: 2 })} MXN*`
          : null;
        return enviartexto(
          `💹 *${p.nombre}* (${p.simbolo})\n\n` +
            `│ En dólares › *$${p.usd.toLocaleString("es-MX", { maximumFractionDigits: 2 })} USD*\n` +
            (pesos ? `${pesos}\n` : "") +
            `│ ${cambio}\n╰─\n\n> Fuente: CoinGecko · dato en vivo\n> Otras: *${PREFIX}crypto eth*, *${PREFIX}crypto sol*`
        );
      } catch (err) {
        return enviartexto(`⚠️ No pude consultar el precio: ${err.message}.\n> Monedas: ${Object.keys(MONEDAS).filter((k) => k.length > 3).join(", ")}`);
      }
    }

    // ── letra ─────────────────────────────────────────────────────────────
    const artista = args[0];
    const titulo = args.slice(1).join(" ");
    if (!artista || !titulo) {
      return enviartexto(
        `《✧》 Uso: *${PREFIX}letra <artista> <título>*\n> Ejemplo: ${PREFIX}letra Coldplay Yellow`
      );
    }

    await enviartexto("⏳ Buscando la letra…");
    try {
      const { artista: a, titulo: t, letra } = await letraCancion(artista, titulo);
      const recortada = letra.length > MAX_LETRA;
      return enviartexto(
        `🎵 *${t}* — ${a}\n\n${letra.slice(0, MAX_LETRA)}${recortada ? "\n\n…(letra recortada)" : ""}\n\n> Fuente: lyrics.ovh`
      );
    } catch (err) {
      return enviartexto(
        `⚠️ No encontré esa letra (${err.message}).\n> Prueba con el artista y el título bien escritos: *${PREFIX}letra Queen Bohemian Rhapsody*`
      );
    }
  },
};
