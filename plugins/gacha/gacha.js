/**
 * plugins/gacha/gacha.js — `.gacha on|off` · `.togacha`
 *
 * Enciende y apaga el gacha en un chat, y sin argumentos enseña cómo va todo.
 * Encenderlo o apagarlo es cosa de administradores (o del dueño del bot); mirar
 * el estado, de cualquiera.
 *
 * El gacha viene encendido: los grupos que ya lo usaban no tienen que configurar
 * nada, y `off` lo deja en silencio sin borrar la colección de nadie.
 */

import { chatDeGacha, limpiarRolls, miles } from "../../lib/gacha.js";
import { esAdmin } from "../../lib/grupo.js";

export default {
  command: ["gacha", "togacha"],

  execute: async (ctx) => {
    const { sock, from, m, sender, args, comando, enviartexto, db, PREFIX, isOwnerCheck, isGroup } = ctx;

    const chat = chatDeGacha(db, from);
    const accion = String(args[0] || "").toLowerCase();
    const estados = { on: true, enable: true, activar: true, off: false, disable: false, desactivar: false };

    // ── Encender o apagar ──
    if (accion in estados) {
      const esDueño = isOwnerCheck ? isOwnerCheck(sender, sock) : false;
      const autorizado = esDueño || (isGroup && (await esAdmin(sock, from, sender, esDueño)));

      if (!autorizado) {
        return enviartexto("⚠️ Solo un administrador del grupo puede encender o apagar el gacha.");
      }

      chat.gacha = estados[accion];
      if (!chat.gacha) limpiarRolls(chat, Date.now());

      return enviartexto(
        chat.gacha
          ? `✅ *Gacha encendido* 🟢\n> Ya se puede tirar con *${PREFIX}rw*.`
          : `🔴 *Gacha apagado*\n> Los comandos de gacha no responden en este chat.\n> Se vuelve a encender con *${PREFIX}gacha on*.`
      );
    }

    // ── Estado y ayuda ──
    const reclamados = Object.values(chat.characters || {}).filter((c) => c.user);
    const puntos = reclamados.reduce((n, c) => n + (Number(c.value) || 0), 0);

    return enviartexto(
      [
        `🎴 *GACHA* — ${chat.gacha === false ? "APAGADO 🔴" : "ENCENDIDO 🟢"}`,
        ``,
        `┏━━━━━━━━━━━━━━━━━━┓`,
        `┃ 🎲 *Tirar* » ${PREFIX}rw`,
        `┃ 🏷️ *Reclamar* » ${PREFIX}claim (citando o no)`,
        `┃ 📚 *Colección* » ${PREFIX}harem`,
        `┃ 🏆 *Ranking* » ${PREFIX}wtop`,
        `┃ 🔎 *Ficha* » ${PREFIX}charinfo <nombre>`,
        `┗━━━━━━━━━━━━━━━━━━┛`,
        ``,
        `♡ Reclamados aquí » *${reclamados.length}*`,
        `✰ Valor acumulado » *${miles(puntos)}*`,
        ``,
        `> Encender o apagar: *${PREFIX}${comando || "gacha"} on|off* (administradores)`,
      ].join("\n")
    );
  },
};
