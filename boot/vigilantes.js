/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * boot/vigilantes.js — los temporizadores del bot, con su apagado.
 *
 * Todo lo que corre solo cada cierto tiempo vive aquí y devuelve una función
 * para detenerlo. Antes los `setInterval` se creaban en `index.js` y en
 * `lib/database.js` sin manera de limpiarlos: al reconectar se apilaban
 * vigilantes duplicados (cada reconexión sumaba uno) y nada se podía probar.
 *
 * Tres vigilantes:
 *
 *   · RECORDATORIOS — repasa los avisos vencidos y los manda. Con cerrojo de
 *     reentrada: si un envío se queda colgado más de 20 s, el siguiente tick no
 *     se le monta encima.
 *   · MEMORIA — un bot con sub-bots abre un socket por cuenta. Si algo filtra,
 *     se ve aquí antes de que el proceso muera por OOM y no en el registro del
 *     proveedor de hosting.
 *   · ANTI-BAN — arma la cola de envíos, el ritmo y el vigilante de riesgo.
 *     Está apagado por defecto (ANTIBAN=off) porque así lo dejó el dueño; se
 *     enciende sin tocar código.
 */

import { vencidos, textoAviso } from "../lib/recordatorios.js";
import {
  crearLimitador,
  crearCola,
  crearSalud,
  crearVigilante,
  envolverSocket,
  AVISO_VETERANO,
} from "../lib/antiban.js";
import { crearRitmo } from "../lib/ritmo.js";

export const AJUSTES_VIGILANTES = {
  /** ms entre repasos de recordatorios. */
  recordatoriosMs: 20_000,
  /** Cuántos avisos se mandan como máximo por repaso. */
  loteRecordatorios: 20,
  /** ms entre lecturas de memoria. */
  memoriaMs: 5 * 60_000,
  /** MB de RSS a partir de los que se avisa. */
  avisoMemoriaMb: 700,
};

/**
 * Vigilante de recordatorios.
 *
 * @param {object} deps
 * @param {function} deps.obtenerSock  () → socket vigente (cambia al reconectar)
 * @param {function} deps.obtenerDb    () → `global.db.data`
 * @param {object}   [deps.ajustes]
 */
export function vigilarRecordatorios({ obtenerSock, obtenerDb, ajustes = {} }) {
  const cfg = { ...AJUSTES_VIGILANTES, ...ajustes };
  let temporizador = null;
  let ocupado = false;
  let mandados = 0;
  let fallos = 0;

  async function revisar() {
    if (ocupado) return; // el repaso anterior aún no termina
    ocupado = true;
    try {
      const db = obtenerDb?.();
      if (!db) return;

      let toca = [];
      try {
        toca = vencidos(db);
      } catch (err) {
        console.error("⚠️ No se pudieron leer los recordatorios:", err?.message || err);
        return;
      }
      if (!toca.length) return;

      const sock = obtenerSock?.();
      if (!sock) return;

      for (const aviso of toca.slice(0, cfg.loteRecordatorios)) {
        try {
          await sock.sendMessage(aviso.chat, { text: textoAviso(aviso) });
          mandados += 1;
        } catch (err) {
          fallos += 1;
          console.error(`⚠️ No se pudo mandar el recordatorio #${aviso?.id}:`, err?.message || err);
        }
      }
    } catch (err) {
      console.error("⚠️ Vigilante de recordatorios:", err?.message || err);
    } finally {
      ocupado = false;
    }
  }

  function iniciar() {
    detener();
    temporizador = setInterval(revisar, cfg.recordatoriosMs);
    temporizador.unref?.();
    const primera = setTimeout(revisar, 30_000);
    primera.unref?.();
    return { revisar, detener };
  }

  function detener() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
  }

  return { iniciar, detener, revisar, resumen: () => ({ mandados, fallos, ocupado }) };
}

/**
 * Vigilante de memoria. Solo mira y avisa: matar el proceso por usar RAM sería
 * peor que dejarlo vivo, y para reiniciar ya está `npm run vigia`.
 */
export function vigilarMemoria({ ajustes = {}, registrar = console.warn } = {}) {
  const cfg = { ...AJUSTES_VIGILANTES, ...ajustes };
  let temporizador = null;

  function leer() {
    const rss = process.memoryUsage.rss() / 1024 / 1024;
    const heap = process.memoryUsage().heapUsed / 1024 / 1024;
    return { rss: Math.round(rss), heap: Math.round(heap) };
  }

  function revisar() {
    const { rss, heap } = leer();
    if (rss >= cfg.avisoMemoriaMb) {
      registrar(`🧠 Memoria alta: RSS ${rss} MB (heap ${heap} MB).`);
    }
    return { rss, heap };
  }

  function iniciar() {
    detener();
    temporizador = setInterval(revisar, cfg.memoriaMs);
    temporizador.unref?.();
    return { revisar, detener };
  }

  function detener() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
  }

  return { iniciar, detener, revisar, leer };
}

/**
 * Arma el anti-ban sobre un socket. Idempotente: llamarlo en cada reconexión no
 * duplica la cola ni el vigilante.
 *
 * @returns {{limitador:any, cola:any, salud:any, vigilante:any, ritmo:any}|null}
 */
export function prepararAntiban(sock, { obtenerDb, encendido, clave } = {}) {
  if (!encendido) return null;
  const db = obtenerDb?.();
  if (!db) return null;

  try {
    // `clave` = número de un sub-bot: cada sub-bot es otra cuenta, así que lleva
    // su propio tope diario y su propio horario. Compartirlos con el bot padre
    // dejaría al sub-bot sin freno en cuanto el padre gastara la cuota del día
    // (o al revés, lo frenaría por mensajes que no mandó).
    let estadoAntiban;
    let estadoRitmo;
    if (clave) {
      db.antibanSubbots ||= {};
      db.ritmoSubbots ||= {};
      estadoAntiban = db.antibanSubbots[clave] ||= {};
      estadoRitmo = db.ritmoSubbots[clave] ||= {};
    } else {
      db.antiban ||= {};
      db.ritmo ||= {};
      estadoAntiban = db.antiban;
      estadoRitmo = db.ritmo;
    }

    const limitador = crearLimitador({ estado: estadoAntiban });
    const salud = crearSalud();
    const ritmo = crearRitmo({ estado: estadoRitmo });
    const cola = crearCola({ limitador, salud, ritmo });

    envolverSocket(sock, { cola, ritmo });

    // riokuroxi-svg: no hay latido de transporte fiable; el silencio no es una caída.
    const vigilante = crearVigilante({ cola, salud, obtenerSock: () => sock, sinSenalMs: Infinity });
    vigilante.iniciar();

    if (limitador.resumen().perfil === "veterano") console.warn(`\n${AVISO_VETERANO}\n`);

    return { limitador, cola, salud, vigilante, ritmo, avisoVeterano: AVISO_VETERANO };
  } catch (err) {
    console.error("⚠️ No se pudo armar el anti-ban:", err?.message || err);
    return null;
  }
}

export default { vigilarRecordatorios, vigilarMemoria, prepararAntiban, AJUSTES_VIGILANTES };
