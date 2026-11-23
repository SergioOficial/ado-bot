/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * plugins/subbots/serbot.js — `.serbot`: el gestor de sub-bots, uno a uno.
 *
 * Tenía un panel con tres botones que mandaban `.serbot code …`, `.serbot
 * estado …` y `.serbot delete …`. Ninguno de los tres existía: el plugin
 * ignoraba los argumentos y volvía a mandar el mismo panel, así que «Eliminar»
 * no eliminaba nada y «Ver Estado» no decía ningún estado. Y encima leía una
 * carpeta `./subs` que no es donde viven las sesiones (`sub/SubBots`), con lo
 * que el panel siempre decía «no tienes bots vinculados».
 *
 * Ahora las tres órdenes hacen lo que prometen, con el mismo inventario que usa
 * `.bots`, y solo sobre los sub-bots de quien escribe (o todos, si es el dueño).
 */
import { readFile } from "node:fs/promises";

import { enviarJuegoHtml } from "../../lib/juego-html.js";
import { subSesiones } from "../../lib/rutas.js";
import { leerConfig } from "../../lib/subbots.js";
import { inventarioSubbots, lineaDeFila } from "../../lib/inventario-subbots.js";

const htmlPath = new URL("../../juegos/code.html", import.meta.url);

function enDisco() {
  try {
    return subSesiones();
  } catch {
    return [];
  }
}

/** El estado real del gestor, sin suponer cómo se llama por dentro. */
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

/**
 * Los números que puede ver quien escribe: los suyos, o todos si es el dueño.
 *
 * Se juntan las sesiones del disco **y** los que el gestor tiene en marcha: si
 * un sub-bot está conectado pero su carpeta no aparece, sigue siendo suyo y
 * tiene que poder mirarlo. Mirando solo el disco, el dueño recibía «no es tuyo»
 * sobre un bot que él mismo acababa de levantar.
 */
function mios(ctx, esOwner, userPhone, resumen) {
  const enMarcha = [
    ...(resumen.numeros || []),
    ...(resumen.conectando || []),
    ...(resumen.reintentando || []).map((r) => r?.numero),
  ].map((n) => String(n ?? "").replace(/\D/g, "")).filter(Boolean);

  let vinculadas = [];
  try {
    vinculadas = subSesiones();
  } catch {}

  const candidatos = [...new Set([...vinculadas, ...enMarcha])];
  return candidatos.filter((numero) => {
    if (esOwner) return true;
    if (numero === userPhone) return true;
    try {
      const cfg = leerConfig(numero);
      return (cfg.owners || []).some((o) => String(o).replace(/\D/g, "") === userPhone);
    } catch {
      return false;
    }
  });
}

export default {
  command: ["serbot", "mibots", "gestorbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, sender, args, enviartexto, config, isOwnerCheck, startSubbot, stopSubbot, jidToNumber, db } = ctx;

    const userPhone = (jidToNumber ? jidToNumber(sender) : String(sender).split("@")[0]).replace(/\D/g, "");
    const botNumber = String(sock.user?.id || "").split("@")[0].split(":")[0];
    const esOwner = Boolean(isOwnerCheck?.(sender, sock));
    const prefijo = config?.prefix?.[0] || ".";

    const accion = String(args?.[0] || "").toLowerCase();
    const objetivo = String(args?.[1] || "").replace(/\D/g, "");
    const resumen = estadoDelGestor(ctx);
    const permitidos = mios(ctx, esOwner, userPhone, resumen);

    // ── Ver el estado de uno ────────────────────────────────────────────────
    if (["estado", "status"].includes(accion)) {
      if (!objetivo) return enviartexto(`⚠️ Uso: *${prefijo}serbot estado <número>*`);
      if (!permitidos.includes(objetivo)) {
        return enviartexto(`🚫 Ese sub-bot no es tuyo. Solo ves y gestionas los que creaste tú.`);
      }
      // `vinculadas` va con lo que hay de verdad en el disco: si se le pasa la
      // lista de permitidos, cualquier sub-bot en marcha figura como «con sesión
      // guardada» aunque su carpeta no exista.
      const inventario = inventarioSubbots({
        resumen,
        vinculadas: enDisco(),
        nombreDe: (n) => db?.users?.[`${n}@s.whatsapp.net`]?.name || "",
      });
      const fila = inventario.filas.find((f) => f.numero === objetivo);
      if (!fila) return enviartexto(`❓ No encuentro ninguna sesión para *${objetivo}*.`);
      return enviartexto(
        `📱 *Sub-bot ${objetivo}*\n\n` +
          `${lineaDeFila(fila)}\n\n` +
          `> Vinculado (sesión guardada): ${fila.vinculado ? "sí" : "no"}\n` +
          `> ${fila.estado === "apagado" ? `Levántalo con *${prefijo}serbot on ${objetivo}*` : "Está en marcha."}`
      );
    }

    // ── Encenderlo ─────────────────────────────────────────────────────────
    if (["on", "activar", "encender", "start"].includes(accion)) {
      if (!objetivo) return enviartexto(`⚠️ Uso: *${prefijo}serbot on <número>*`);
      if (!permitidos.includes(objetivo)) return enviartexto(`🚫 Ese sub-bot no es tuyo.`);
      await enviartexto(`⏳ Levantando el sub-bot *${objetivo}*…`);
      const destino = `${objetivo}@s.whatsapp.net`;
      await startSubbot(sock, destino, from, enviartexto, "sesion", userPhone);
      return null;
    }

    // ── Apagarlo y borrar su sesión ────────────────────────────────────────
    if (["delete", "borrar", "eliminar", "del", "off"].includes(accion)) {
      if (!objetivo) return enviartexto(`⚠️ Uso: *${prefijo}serbot delete <número>*`);
      if (!permitidos.includes(objetivo)) return enviartexto(`🚫 Ese sub-bot no es tuyo.`);
      const hecho = await stopSubbot(objetivo);
      if (hecho) {
        return enviartexto(
          `🗑️ Sub-bot *${objetivo}* detenido y su sesión eliminada.\n\n` +
            `> Para volver a tenerlo: *${prefijo}code* con ese número.`
        );
      }
      return enviartexto(`⚠️ No había nada que borrar en *${objetivo}* (¿ya estaba apagado y sin sesión?).`);
    }

    // ── Pedir código para uno nuevo ────────────────────────────────────────
    if (["code", "codigo", "código"].includes(accion)) {
      const numero = objetivo || userPhone;
      if (!numero) return enviartexto(`⚠️ Uso: *${prefijo}serbot code <número>*`);
      if (numero !== userPhone && !esOwner) {
        return enviartexto(
          `💎 Para vincular otro número hace falta Premium o ser dueño del bot.\n` +
            `> Mientras tanto, usa *${prefijo}code* con tu propio número: es gratis.`
        );
      }
      const destino = `${numero}@s.whatsapp.net`;
      return startSubbot(sock, destino, from, enviartexto, "code", userPhone);
    }

    // ── Panel ──────────────────────────────────────────────────────────────
    const inventario = inventarioSubbots({
      resumen,
      vinculadas: enDisco(),
      nombreDe: (n) => db?.users?.[`${n}@s.whatsapp.net`]?.name || "",
    });

    // El prefijo sale de la config y el texto del enlace va codificado: si el
    // prefijo no es «.», un enlace fijo mandaba un comando que no existe.
    const orden = (accion, numero) =>
      `https://wa.me/${botNumber}?text=${encodeURIComponent(`${prefijo}serbot ${accion} ${numero}`)}`;

    let listaHTML = "";
    for (const fila of inventario.filas) {
      listaHTML += `
                <div class="bot-item">
                  <span>📱 ${fila.numero} · ${fila.estado}</span>
                </div>
                <div class="btn-group" style="margin-bottom: 15px;">
                  <a href="${orden("estado", fila.numero)}" class="btn btn-outline">Ver Estado</a>
                  <a href="${orden("delete", fila.numero)}" class="btn btn-danger">Eliminar</a>
                </div>
              `;
    }
    if (!listaHTML) {
      listaHTML = `<div class="empty">No tienes bots vinculados aún. Crea uno con .code</div>`;
    }

    let html;
    try {
      html = await readFile(htmlPath, "utf8");
    } catch {
      // Sin el HTML a mano, mejor la lista en texto que un mensaje vacío.
      const lineas = inventario.filas.length
        ? inventario.filas.map((f) => lineaDeFila(f)).join("\n")
        : `> No tienes bots vinculados aún. Crea uno con *${prefijo}code*`;
      return enviartexto(`🤖 *Gestor de Sub-Bots*\n\n${lineas}\n\n➭ ${prefijo}serbot estado <número>\n➭ ${prefijo}serbot delete <número>`);
    }

    html = html.replace(/\{\{BOT_NUMBER\}\}/g, botNumber);
    html = html.replace(/\{\{USER_PHONE\}\}/g, userPhone);
    html = html.replace(/\{\{LISTA_BOTS\}\}/g, listaHTML);
    return enviarJuegoHtml(sock, from, html, "🤖 Gestor de Sub-Bots");
  },
};
