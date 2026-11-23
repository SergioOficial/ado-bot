/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * plugins/subbots/bots.js — `.bots`: cuántos sub-bots hay y cómo están.
 *
 * Antes este archivo importaba `boot/subbots.js` buscando `conns`, `subbots` o
 * `sockets`, que no existen (lo que se exporta es `crearGestorSubbots`), y caía
 * a `global.conns`, que nadie llena. Resultado: la lista salía siempre con uno,
 * el principal, aunque hubiera diez sub-bots conectados. Eso es exactamente lo
 * que contestaba «no sé cuántos sub-bots tengo».
 *
 * Ahora la cuenta sale de donde está de verdad: el gestor de sub-bots
 * (`getActiveSubbots` / `resumen`), que es quien sabe quién está conectado, y
 * las sesiones en disco, que son las que se pueden arrancar sin pedir código.
 */
import { subSesiones } from "../../lib/rutas.js";
import { inventarioSubbots, lineaDeFila } from "../../lib/inventario-subbots.js";

/** Lo que el gestor sabe, sin suponer qué versión del núcleo hay debajo. */
function estadoDelGestor(ctx) {
  try {
    const delNucleo = global.nucleo?.subbots?.resumen?.();
    if (delNucleo) return delNucleo;
  } catch {}
  try {
    const activos = ctx.getActiveSubbots?.();
    if (activos) return { numeros: [...activos.keys()], maximo: null };
  } catch {}
  return {};
}

function vinculadasEnDisco() {
  try {
    return subSesiones();
  } catch {
    return [];
  }
}

export default {
  command: ["bots", "sockets", "subbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db } = ctx;

    const miJid = sock.user?.id || "";
    const miNumero = String(miJid).split("@")[0].split(":")[0];
    const nombreDe = (numero) => db?.users?.[`${numero}@s.whatsapp.net`]?.name || "";

    const resumen = estadoDelGestor(ctx);
    const vinculadas = vinculadasEnDisco();
    const inventario = inventarioSubbots({ resumen, vinculadas, nombreDe });

    // Solo los sub-bots: el principal se nombra aparte para no contarlo dos veces.
    const subs = inventario.filas.filter((f) => f.numero !== miNumero);

    let texto = `ꕥ *Sub-bots de este bot*\n\n`;
    // «En total» es lo que la persona pregunta de verdad: cuántas cuentas hay.
    // Antes decía «vinculados (en disco)» y, si una sesión estaba en marcha pero
    // no se encontraba el archivo, el número salía en cero con el bot conectado.
    texto += `ੈ❖‧₊˚ Sub-bots en total › *${subs.length}*\n`;
    texto += `ੈ✰︎︎‧₊˚ Conectados ahora › *${subs.filter((f) => f.estado === "conectado").length}*`;
    texto += inventario.maximo ? ` de *${inventario.maximo}*\n` : `\n`;
    if (subs.some((f) => f.estado === "apagado" && f.vinculado)) {
      texto += `ੈ✦‧₊˚ Con sesión guardada › *${subs.filter((f) => f.vinculado).length}*\n`;
    }
    if (subs.some((f) => f.estado === "conectando")) {
      texto += `ੈ◌‧₊˚ Conectando › *${subs.filter((f) => f.estado === "conectando").length}*\n`;
    }
    if (subs.some((f) => f.estado === "reintentando")) {
      texto += `ੈ✿‧₊˚ En reintento › *${subs.filter((f) => f.estado === "reintentando").length}*\n`;
    }
    if (subs.some((f) => f.estado === "apagado")) {
      texto += `ੈ❁‧₊˚ Apagados › *${subs.filter((f) => f.estado === "apagado").length}*\n`;
    }

    if (!subs.length) {
      texto += `\n> No hay ningún sub-bot vinculado todavía.\n`;
      texto += `> Se crea con *${ctx.config?.prefix?.[0] || "."}code* (tu propio número)\n`;
      texto += `> o con *${ctx.config?.prefix?.[0] || "."}jadibot <número>* (Premium o dueño).`;
    } else {
      texto += `\n➭ *Detalle*\n`;
      for (const fila of subs) texto += `${lineaDeFila(fila)}\n`;
      texto += `\n> \`.revivirsubs\` levanta todos los vinculados · \`.serbot\` los gestiona uno a uno.`;
    }

    // Los que además están en este grupo. Se pregunta al grupo, no al gestor:
    // son cosas distintas (un sub-bot puede estar conectado y no estar aquí).
    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(from);
        const enGrupo = new Set(
          (meta.participants || []).map((p) => String(p.id).split("@")[0].split(":")[0])
        );
        const aqui = losDelGrupo([miNumero, ...subs.map((f) => f.numero)], enGrupo);
        texto += `\n➭ *En este grupo ›* ${aqui.length}`;
        for (const numero of aqui) {
          const esPrincipal = numero === miNumero;
          const nombre = nombreDe(numero) || (esPrincipal ? "este bot" : "sub-bot");
          texto += `\n- [${esPrincipal ? "Principal" : "Sub"} *${nombre}*] › @${numero}`;
        }
      } catch {
        texto += `\n➭ *En este grupo* › no pude leer la lista (¿el bot es admin?)`;
      }
    }

    const menciones = [...new Set([...subs.map((f) => `${f.numero}@s.whatsapp.net`)])];
    return sock.sendMessage(from, { text: texto.trim(), mentions: menciones }, { quoted: m });
  },
};

/** Los de la lista que participan en el grupo, principal primero. */
function losDelGrupo(numeros, enGrupo) {
  const vistos = [];
  for (const n of numeros) if (enGrupo.has(n) && !vistos.includes(n)) vistos.push(n);
  return vistos.sort((a, b) => (numeros[0] === a ? -1 : numeros[0] === b ? 1 : 0));
}
