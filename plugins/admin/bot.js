/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .bot on|off — apagar el bot en este grupo.
 *
 * Apagado, el bot no responde a **ningún** comando salvo el de volver a
 * encenderlo (lo comprueba el router, no cada plugin: si fuera por plugin,
 * siempre se olvida uno y el «apagado» no apaga nada).
 */
export default {
  command: ["bot", "boton", "botoff"],
  isAdmin: true,
  execute: async (ctx) => {
    const { db, from, args, enviartexto, PREFIX, config } = ctx;
    const c = (db.chats ||= {})[from] ||= {};
    const estado = String(args[0] || "").toLowerCase();

    if (!["on", "off"].includes(estado)) {
      return enviartexto(
        `🤖 *Bot en este grupo:* ${c.botApagado ? "APAGADO 🔴" : "ENCENDIDO 🟢"}\n` +
          `> *${PREFIX}bot off* — que no responda a nada\n> *${PREFIX}bot on* — volver a encenderlo`
      );
    }

    c.botApagado = estado === "off";
    db.saveDatabase?.();

    return enviartexto(
      c.botApagado
        ? `🔴 El bot queda *apagado* en este grupo.\n> Solo responderá a *${PREFIX}bot on*.\n> _${config.botName}_`
        : `🟢 El bot vuelve a estar *encendido* en este grupo.`
    );
  },
};
