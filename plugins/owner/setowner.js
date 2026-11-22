/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .setowner — los dueños de este bot.
 *
 * Los dueños son dos listas: los de `config.js` / variable de entorno (los de
 * siempre, que no se tocan desde aquí) y los que se añaden con este comando, que
 * se guardan por bot en su archivo de configuración. Así `.setowner` no puede
 * dejar al bot sin ningún dueño: aunque se borren todos los añadidos, los de
 * `OWNERS` siguen mandando.
 */
import { numeroDe } from "../../lib/grupo.js";

const esJid = (t) => /^[0-9]{8,15}@s\.whatsapp\.net$/.test(String(t || ""));

export default {
  command: ["setowner", "setbotowner", "dueño"],
  isOwner: true,
  execute: async (ctx) => {
    const { args, enviartexto, sock, m, jidToNumber, loadSubConfig, saveSubConfig, getTargetFromMsg, PREFIX } = ctx;

    const numeroPropio = typeof jidToNumber === "function" ? jidToNumber(sock?.user?.id) : "";
    const cfg = loadSubConfig ? loadSubConfig(numeroPropio) : (sock?.subconfig || {});
    const añadidos = Array.isArray(cfg.owners) ? cfg.owners.slice() : [];
    const deFabrica = (ctx.config?.owners || []).map((o) => (typeof o === "string" ? o : o?.number)).filter(Boolean);

    const ver = () =>
      `👑 *Dueños de este bot*\n\n` +
      (deFabrica.length ? `*De fábrica:*\n${deFabrica.map((n) => `> +${n}`).join("\n")}\n\n` : "") +
      (añadidos.length ? `*Añadidos con el comando:*\n${añadidos.map((n) => `> +${n}`).join("\n")}` : "*Añadidos:* _ninguno_") +
      `\n\n> Añadir: *${PREFIX}setowner @alguien*\n> Quitar: *${PREFIX}setowner clear*`;

    const texto = args.join(" ").trim();

    if (!texto) {
      // Sin argumentos y sin nadie citado: se enseña la lista.
      const objetivo = typeof getTargetFromMsg === "function" ? getTargetFromMsg(m, args) : null;
      if (!objetivo) return enviartexto(ver());
    }

    if (/^(clear|limpiar|borrar|reset)$/i.test(texto)) {
      if (!añadidos.length) return enviartexto("ℹ️ No hay ningún dueño añadido que quitar.");
      cfg.owners = [];
      saveSubConfig(numeroPropio, cfg);
      if (sock) sock.subconfig = cfg;
      return enviartexto("✅ *Dueños añadidos eliminados.*\n> Los de `OWNERS` siguen mandando igual.");
    }

    // El objetivo: el citado, el mencionado o el primer argumento.
    let objetivo = typeof getTargetFromMsg === "function" ? getTargetFromMsg(m, args) : null;
    if (!objetivo) {
      const limpio = texto.replace(/[^0-9]/g, "");
      if (limpio.length >= 8) objetivo = `${limpio}@s.whatsapp.net`;
    }
    if (!objetivo || !esJid(objetivo)) {
      return enviartexto(
        `⚠️ No sé a quién te refieres.\n> Menciona a la persona, cita su mensaje o escribe el número completo.\n> Ejemplo: *${PREFIX}setowner +5215512345678*`
      );
    }

    const numero = numeroDe(objetivo) || jidToNumber(objetivo);
    if (!numero) return enviartexto("⚠️ Ese número no parece válido.");
    if (numero === numeroPropio) return enviartexto("⚠️ El bot ya es mío: pon el número del dueño, no el del propio bot.");
    if (añadidos.includes(numero)) return enviartexto(`ℹ️ +${numero} ya es dueño de este bot.`);

    añadidos.push(numero);
    cfg.owners = añadidos;
    saveSubConfig(numeroPropio, cfg);
    if (sock) sock.subconfig = cfg;

    await enviartexto(`✅ *Dueño añadido:* +${numero}\n\n> Ahora manda igual que tú en este bot.`);
  },
};
