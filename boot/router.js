/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * boot/router.js — de `messages.upsert` a un plugin, con aislamiento de fallos.
 *
 * Antes todo esto vivía dentro de `index.js`, mezclado con la conexión, los
 * sub-bots y los vigilantes, y compartiendo variables del módulo. Cualquier
 * cambio ahí obligaba a releer seiscientas líneas para saber qué se rompió, y un
 * error suelto se llevaba el proceso entero.
 *
 * Aquí el manejador es una fábrica: recibe lo que necesita y devuelve una
 * función. Dos consecuencias que importan:
 *
 *   · Se puede probar sin abrir WhatsApp (pruebas/router.test.mjs le pasa un
 *     socket y unos plugins falsos).
 *   · Cada mensaje va dentro de su propio `try`. Un plugin que revienta pierde
 *     ese comando y nada más; el siguiente mensaje se atiende igual.
 *
 * Las reglas de qué se atiende están en `lib/compuerta.js` y el corte del eco
 * entre cuentas en `lib/bucles.js`. Este archivo solo orquesta.
 *
 * El aislamiento por mensaje y el filtro de los errores de red siguen el esquema
 * del router de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD).
 */

import { compuerta } from "../lib/compuerta.js";

/**
 * @param {object} deps
 * @param {object}   deps.sock          cliente de WhatsApp (principal o sub-bot)
 * @param {Map}      deps.commands      nombre de comando → plugin
 * @param {object}   deps.config        configuración global
 * @param {function} deps.obtenerDb     () → `global.db.data` (se lee en cada mensaje)
 * @param {function} deps.esOwner       (jid, sock) → boolean
 * @param {function} deps.esAdminGrupo  (sock, chat, jid, esOwner) → Promise<boolean>
 * @param {function} deps.autorReal     (m) → jid de quien escribió de verdad
 * @param {function} [deps.guarda]      () → guarda anti-bucle de este socket
 * @param {function} [deps.enviar]      (jid, contenido, opciones) → Promise (apunta las salidas)
 * @param {object}   [deps.ritmo]       limitador de ritmo entrante
 * @param {object}   [deps.cola]        cola anti-ban, si está encendida
 * @param {object}   [deps.salud]       monitor de salud, si está encendido
 * @param {Set}      [deps.urgentes]    comandos que pasan con prioridad
 * @param {object}   [deps.extras]      ayudas que se le pasan al plugin en el ctx
 * @param {string}   [deps.nombreBot]
 * @param {function} [deps.registrar]   dónde apuntar los fallos
 * @returns {(ev: object) => Promise<void>}
 */
export function crearRouter(deps) {
  const {
    sock,
    commands,
    config,
    obtenerDb,
    esOwner,
    esAdminGrupo,
    autorReal,
    guarda,
    enviar,
    ritmo,
    cola,
    salud,
    urgentes = new Set(),
    extras = {},
    nombreBot = config?.botName || "Bot",
    registrar = (err) => console.error("❌ Router:", err?.stack || err),
  } = deps;

  const prefijos = config?.prefix?.length ? config.prefix : ["."];
  const prefijoPrincipal = prefijos[0];

  const mandar =
    enviar ||
    ((jid, contenido, opciones) => Promise.resolve(sock.sendMessage(jid, contenido, opciones)));

  /**
   * El manejador. Nunca lanza: lo que falle se apunta y se contesta si se puede.
   */
  return async function atender(ev) {
    try {
      if (!ev || ev.type !== "notify") return;
      const mensajes = ev.messages;
      if (!Array.isArray(mensajes) || !mensajes.length) return;

      const m = mensajes[0];

      // 🚪 ¿Esto es un comando que me toca? Lo decide lib/compuerta.js.
      const entrada = compuerta(m, {
        prefijos,
        conoce: (nombre) => commands?.has?.(nombre) ?? false,
        prefijoBoton: prefijoPrincipal,
      });
      if (!entrada.pasa) return;

      ritmo?.anotarEntrante?.(m.key?.remoteJid);

      const db = obtenerDb?.();
      if (!db) {
        // Sin base no se puede atender nada con garantías (economía, RPG,
        // ajustes del grupo). Mejor decirlo que escribir a medias.
        console.error("⚠️ Mensaje descartado: la base de datos no está cargada.");
        return;
      }

      const remoteJid = m.key?.remoteJid;
      if (!remoteJid) return;
      const isGroup = String(remoteJid).endsWith("@g.us");
      const from = remoteJid;
      const sender = autorReal(m) || remoteJid;

      // Sufijo «-» en el comando: se ejecuta en privado y, si era un grupo, se
      // borra el mensaje para no dejar el pedido a la vista de todos.
      let textoLimpio = [entrada.comando, ...entrada.args].join(" ");
      let esPrivado = false;

      if (textoLimpio.length) {
        const primera = textoLimpio.split(/\s+/)[0];
        if (primera.endsWith("-")) {
          esPrivado = true;
          textoLimpio = textoLimpio.replace(/^([^-]+)-/, "$1");
          if (isGroup) await sock.sendMessage(from, { delete: m.key }).catch(() => {});
        }
      }

      const args = textoLimpio.trim().split(/\s+/).filter(Boolean);
      const comando = (args.shift() || "").toLowerCase();
      if (!comando) return;

      // 🔁 Eco entre cuentas: el mismo pedido calcado dos veces seguidas, o una
      // respuesta mía que vuelve citada. Se corta antes de tocar el plugin.
      const antiBucle = guarda?.();
      if (antiBucle) {
        const veredicto = antiBucle.permite({ chat: from, autor: sender, comando, args }, m);
        if (!veredicto.pasa) {
          console.log(`🔁 [${from}] cortado por anti-bucle: ${veredicto.motivo}`);
          return;
        }
      }

      if (entrada.deBoton) {
        sock.sendMessage(from, { react: { text: "⚡", key: m.key } }).catch(() => {});
      }

      const plugin = commands.get(comando);
      if (!plugin) return;

      // El grupo puede tener el bot apagado; solo se deja pasar el interruptor.
      if (isGroup && db?.chats?.[remoteJid]?.botApagado) {
        if (comando !== "bot" && comando !== "boton") return;
      }

      // Si el grupo tiene un bot primario asignado, los demás se callan.
      // `setprimary` queda fuera para poder cambiarlo.
      if (isGroup && comando !== "setprimary" && comando !== "primary") {
        const primario = db?.chats?.[remoteJid]?.primaryBot;
        if (primario) {
          const yo = `${numeroDe(sock?.user?.id)}@s.whatsapp.net`;
          if (yo !== primario) return;
        }
      }

      const targetChat = esPrivado ? sender : from;
      const enviartexto = (txt) =>
        mandar(targetChat, { text: txt }, { quoted: esPrivado ? null : m }).catch((err) => {
          console.error(`⚠️ No se pudo contestar en ${targetChat}:`, err?.message || err);
        });

      console.log(`💬 [${from}] ${entrada.texto} ${esPrivado ? "🔒 (Privado)" : ""}`);

      if (plugin.isOwner && !esOwner(sender, sock)) {
        return enviartexto("⚠️ Este comando es exclusivo de los Owners.");
      }

      if (plugin.isAdmin) {
        if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");
        const autorizado = await esAdminGrupo(sock, from, sender, esOwner(sender, sock));
        if (!autorizado) return enviartexto("⚠️ Solo los administradores pueden usar este comando.");
      }

      const ctx = {
        sock,
        m,
        from: targetChat,
        sender,
        isGroup,
        args,
        comando,
        texto: textoLimpio,
        enviartexto,
        PREFIX: entrada.prefijo || prefijoPrincipal,
        BOT_NAME: nombreBot,
        config,
        db,
        ...extras,
      };

      // 🔒 El plugin va aislado. Lo que reviente aquí no pasa al siguiente mensaje.
      try {
        if (urgentes.has(comando) && cola?.conPrioridad) {
          await cola.conPrioridad(() => plugin.execute(ctx));
        } else {
          await plugin.execute(ctx);
        }
      } catch (error) {
        console.error(`❌ Error en #${comando}:`, error?.stack || error);
        salud?.anotarError?.(error);
        await enviartexto(`⚠️ Error en *${comando}*.\n_${error?.message || error}_`);
      }
    } catch (error) {
      // Fallo del propio router (no de un plugin). Se apunta y se sigue vivo.
      registrar(error);
      salud?.anotarError?.(error);
    }
  };
}

/** La parte numérica de un jid, sin el dispositivo ni el dominio. */
export function numeroDe(jid) {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0];
}

export default { crearRouter, numeroDe };
