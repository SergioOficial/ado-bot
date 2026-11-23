/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * plugins/owner/revivirsubs.js — `.revivirsubs`: levantar todos los vinculados.
 *
 * Antes decía «subbots activos en total» contando justo después de pedirlos, y
 * en ese instante ninguno ha abierto todavía: el informe contestaba 0 aunque
 * acabara de levantar tres. Ahora se espera a que el gestor diga en qué quedó y
 * se cuenta por estados (conectados, conectando, en reintento).
 */
import { numerosDeSubSesiones } from "../../lib/rutas.js";
import { inventarioSubbots } from "../../lib/inventario-subbots.js";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms).unref?.());

export default {
  command: ["revivirsubs", "restarsubs", "activarsubs"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, enviartexto, getActiveSubbots, startSubbot } = ctx;

    const numeros = numerosDeSubSesiones();
    if (!numeros.length) {
      return enviartexto("❌ No hay sesiones de sub-bots vinculadas.");
    }

    const activos = Array.from(getActiveSubbots?.().keys() || []).map(String);
    const yaActivos = numeros.filter((n) => activos.includes(n));
    const porLevantar = numeros.filter((n) => !activos.includes(n));

    await enviartexto(
      `⏳ *Reactivando sub-bots…*\n> ${numeros.length} vinculados · ${yaActivos.length} ya estaban arriba · ${porLevantar.length} por levantar`
    );

    let lanzados = 0;
    let fallidos = 0;
    for (const numero of porLevantar) {
      try {
        const destino = `${numero}@s.whatsapp.net`;
        const avisar = async (texto) => {
          try { await sock.sendMessage(destino, { text: texto }); } catch {}
        };
        await startSubbot(sock, destino, destino, avisar, "sesion");
        lanzados++;
        // Pausa entre uno y otro: levantar diez cuentas a la vez es justo lo que
        // mira el anti-ban de WhatsApp.
        await esperar(1500);
      } catch (e) {
        console.error(`Error reviviendo subbot ${numero}:`, e.message);
        fallidos++;
      }
    }

    // Unos segundos para que abran; si no, el informe sale todo en «conectando».
    await esperar(4000);

    const resumen = global.nucleo?.subbots?.resumen?.() || { numeros: [...(getActiveSubbots?.().keys() || [])] };
    const inventario = inventarioSubbots({ resumen, vinculadas: numeros });

    const reporte = `
♻️ *REACTIVACIÓN DE SUB-BOTS*

┏━━━━━━━━━━━━━━━━━━┓
┃ ➤ *Ya estaban activos:* ${yaActivos.length}
┃ ➤ *Levantados ahora:* ${lanzados}
┃ ➤ *Fallidos:* ${fallidos}
┗━━━━━━━━━━━━━━━━━━┛

🟢 *Conectados:* ${inventario.activos} de ${numeros.length}
${inventario.conectando ? `🟡 *Conectando:* ${inventario.conectando}\n` : ""}${inventario.reintentando ? `🟠 *En reintento:* ${inventario.reintentando}\n` : ""}${inventario.apagados ? `⚪ *Apagados:* ${inventario.apagados}\n` : ""}
> \`.bots\` lo cuenta cuando quieras.`.trim();

    await enviartexto(reporte);
  },
};
