/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * boot/router.js — de `messages.upsert` a un plugin, con aislamiento de fallos.
 */

import { compuerta } from "../lib/compuerta.js";
import { prefijosDe, modoPrivado } from "../lib/ajustes.js";

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
 * @param {boolean}  [deps.permitirPropios] Permite que el bot procese sus propios mensajes (Self-bot)
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
    permitirPropios = false, // 👈 NUEVO: por defecto el bot no se escucha a sí mismo para evitar bucles.
    registrar = (err) => console.error("❌ Router:", err?.stack || err),
  } = deps;

  // Los prefijos se leen en cada mensaje: `.setprefix` los cambia en caliente y
  // el siguiente mensaje ya tiene que entrar por el nuevo.
  const prefijosDeConfig = prefijosDe(null, config);

  const mandar =
    enviar ||
    ((jid, contenido, opciones) => Promise.resolve(sock.sendMessage(jid, contenido, opciones)));

  async function atenderMensaje(ev) {
    try {
      if (!ev || ev.type !== "notify") return;
      const mensajes = ev.messages;
      if (!Array.isArray(mensajes) || !mensajes.length) return;

      const m = mensajes[0];

      const db = obtenerDb?.();
      if (!db) {
        console.error("⚠️ Mensaje descartado: la base de datos no está cargada.");
        return;
      }

      const prefijos = prefijosDe(db, config) || prefijosDeConfig;
      const prefijoPrincipal = prefijos[0];

      // 🚪 ¿Esto es un comando que me toca?
      const entrada = compuerta(m, {
        prefijos,
        conoce: (nombre) => commands?.has?.(nombre) ?? false,
        prefijoBoton: prefijoPrincipal,
        permitirPropios, // 👈 Le pasamos la configuración a la compuerta
      });
      if (!entrada.pasa) return;

      ritmo?.anotarEntrante?.(m.key?.remoteJid);

      const remoteJid = m.key?.remoteJid;
      if (!remoteJid) return;
      const isGroup = String(remoteJid).endsWith("@g.us");
      const from = remoteJid;
      const sender = autorReal(m) || remoteJid;

      // Sufijo «-» en el comando para privado
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

      // 🔁 Anti-bucle
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

      // 🚨 INTERRUPTORES DE GRUPO (Bot apagado)
      if (isGroup && db?.chats?.[remoteJid]?.botApagado) {
        if (comando !== "bot" && comando !== "boton") return;
      }

      // 🚨 BOT PRIMARIO: Reparado
      // Ignoramos el mensaje si el grupo tiene un bot primario y no soy yo.
      // Los comandos de control (setprimary, primary, bot) siempre pasan para poder recuperar el control.
      if (isGroup && !["setprimary", "primary", "bot"].includes(comando)) {
        const primario = db?.chats?.[remoteJid]?.primaryBot;
        if (primario) {
          const numeroYo = numeroDe(sock?.user?.id);
          const numeroPrimario = numeroDe(primario);
          if (numeroYo !== numeroPrimario) {
            console.log(`🤫 [${from}] ignorado: no soy el bot primario (${numeroYo} != ${numeroPrimario})`);
            return; 
          }
        }
      }

      const targetChat = esPrivado ? sender : from;
      const enviartexto = (txt) =>
        mandar(targetChat, { text: txt }, { quoted: esPrivado ? null : m }).catch((err) => {
          console.error(`⚠️ No se pudo contestar en ${targetChat}:`, err?.message || err);
        });

      console.log(`💬 [${from}] ${entrada.texto} ${esPrivado ? "🔒 (Privado)" : ""}`);

      // 🛡️ PERMISOS: Verificamos si es Owner, o si es un Bot autorizado (para que los bots puedan usar comandos)
      const esBotAutorizado = m.key.fromMe || sender.endsWith('@bot') || Boolean(db?.subbots?.[sender]);
      const tienePermisosOwner = esOwner(sender, sock) || esBotAutorizado;

      // 🔒 Modo privado (`.self on`): el bot solo atiende a su dueño. Se mira
      // antes de gastar nada más, y se va en silencio: contestar «no puedes»
      // convertiría el modo privado en un bot que responde a todo el mundo.
      if (modoPrivado(db) && !tienePermisosOwner) return;

      if (plugin.isOwner && !tienePermisosOwner) {
        return enviartexto("⚠️ Este comando es exclusivo de los Owners.");
      }

      if (plugin.isAdmin) {
        if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");
        // Pasamos "tienePermisosOwner" a la validación de admin
        const autorizado = await esAdminGrupo(sock, from, sender, tienePermisosOwner);
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

      // 🔒 Ejecución aislada
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
      registrar(error);
      salud?.anotarError?.(error);
    }
  }

  return async function atender(ev) {
    if (ev?.type !== "notify" || !Array.isArray(ev.messages)) return;
    for (const mensaje of ev.messages) {
      await atenderMensaje({ ...ev, messages: [mensaje] });
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