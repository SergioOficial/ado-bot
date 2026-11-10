/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .warn [@quien] [razón]   advertencia (menciona, cita o escribe el número)
 * .warns [@quien]          las advertencias de alguien
 * .delwarn [@quien]        quita la última   ·   .delwarn all   las quita todas
 * .setwarnlimit <1-10>     cuántas antes de avisar   ·   .setwarnlimit 3 expulsar on|off
 *
 * Lo que se corrigió del original:
 *   · El objetivo se busca en mención, cita **o número escrito**; antes, sin
 *     mención, el comando se quedaba mudo.
 *   · Si no hay límite configurado se usa 3, y el límite se puede ver.
 *   · Las advertencias se normalizan al leer: un JSON roto ya no revienta nada.
 *   · El aviso de expulsión dice si se expulsó de verdad o por qué no.
 */
import {
  objetivo, warnsDe, ponerWarns, limiteDe, cajaWarns, mencion, numeroDe, fecha,
} from "../../lib/grupo.js";

const AYUDA = (PREFIX) =>
  `《✧》 A quién le doy la advertencia?\n` +
  `> Menciona, cita su mensaje o escribe el número:\n` +
  `> *${PREFIX}warn @alguien hizo algo*\n> *${PREFIX}warn 5215512345678 hizo algo*`;

export default {
  command: ["warn", "warns", "delwarn", "setwarnlimit"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, sender, args, comando, db, enviartexto, PREFIX } = ctx;

    // ── límite ────────────────────────────────────────────────────────────
    if (comando === "setwarnlimit") {
      cajaWarns(db, from);
      const chat = db.chats[from];

      if (String(args[0] || "").toLowerCase() === "expulsar") {
        const valor = String(args[1] || "").toLowerCase();
        if (!["on", "off", "si", "sí", "no"].includes(valor)) {
          return enviartexto(
            `《✧》 Di si quieres expulsión automática.\n> *${PREFIX}setwarnlimit expulsar on*\n> *${PREFIX}setwarnlimit expulsar off*`
          );
        }
        chat.expulsar = ["on", "si", "sí"].includes(valor);
        return enviartexto(
          chat.expulsar
            ? `⚖️ Al llegar al límite de advertencias, *expulso* al miembro (si soy administrador).`
            : `⚖️ Al llegar al límite solo avisaré: *no* expulso a nadie.`
        );
      }

      const n = Number(args[0]);
      if (!Number.isInteger(n) || n < 1 || n > 10) {
        return enviartexto(
          `《✧》 El límite tiene que ser un número entre *1* y *10*.\n` +
            `> Ahora mismo: *${limiteDe(db, from)}*\n> Ejemplo: *${PREFIX}setwarnlimit 3*`
        );
      }
      chat.warnLimit = n;
      return enviartexto(
        `⚖️ Límite de advertencias: *${n}*.\n` +
          `> Expulsión automática: *${chat.expulsar ? "sí" : "no"}* (cámbialo con *${PREFIX}setwarnlimit expulsar on*)`
      );
    }

    // ── a quién ───────────────────────────────────────────────────────────
    const jid = objetivo(ctx);
    if (!jid) return enviartexto(AYUDA(PREFIX));
    if (numeroDe(jid) === numeroDe(sock.user?.id || sock.user?.jid)) {
      return enviartexto("《✧》 A mí no me pongas advertencias. 😅");
    }

    // ── warns: ver ────────────────────────────────────────────────────────
    if (comando === "warns") {
      const lista = warnsDe(db, from, jid);
      if (!lista.length) return enviartexto(`ꕥ *${mencion(jid, db)}* no tiene advertencias.`);
      const lineas = lista.map((w, i) => `│ #${lista.length - i} · ${w.razon}\n│   ${fecha(w.fecha)} · por @${numeroDe(w.por) || "?"}`);
      return sock.sendMessage(
        from,
        {
          text:
            `⚖️ *Advertencias de ${mencion(jid, db)}* (${lista.length}/${limiteDe(db, from)})\n` +
            `${lineas.join("\n")}\n\n> Quitar la última: *${PREFIX}delwarn*`,
          mentions: [jid],
        },
        { quoted: m }
      );
    }

    // ── delwarn: quitar ───────────────────────────────────────────────────
    if (comando === "delwarn") {
      const lista = warnsDe(db, from, jid);
      if (!lista.length) return enviartexto(`ꕥ *${mencion(jid, db)}* no tiene advertencias que quitar.`);

      const todas = String(args[0] || "").toLowerCase() === "all";
      const quedan = todas ? [] : lista.slice(0, -1);
      ponerWarns(db, from, jid, quedan);

      return sock.sendMessage(
        from,
        {
          text: todas
            ? `🧹 Advertencias de ${mencion(jid, db)} borradas *todas* (había ${lista.length}).`
            : `🧹 Una advertencia menos para ${mencion(jid, db)}. Quedan *${quedan.length}*.`,
          mentions: [jid],
        },
        { quoted: m }
      );
    }

    // ── warn: poner ───────────────────────────────────────────────────────
    const mencionado = Boolean(m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length);
    const razon = (mencionado ? args.slice(1) : args).join(" ").replace(/^[\d+\s]+/, "").trim() || "Sin razón.";
    const lista = warnsDe(db, from, jid);
    lista.unshift({ razon: razon.slice(0, 200), fecha: Date.now(), por: sender });
    ponerWarns(db, from, jid, lista);
    db.saveDatabase?.();

    const limite = limiteDe(db, from);
    const chat = db.chats[from];
    const total = lista.length;

    let extra = "";
    if (total >= limite) {
      if (!chat.expulsar) {
        extra = `\n\n> ⚖️ Llegó al límite (*${limite}*). Expulsión automática *apagada*: actívala con *${PREFIX}setwarnlimit expulsar on*.`;
      } else {
        try {
          await sock.groupParticipantsUpdate(from, [jid], "remove");
          ponerWarns(db, from, jid, []);
          extra = `\n\n> ❖ Alcanzó el límite (*${limite}*) y fue *expulsado* del grupo.`;
        } catch (err) {
          extra = `\n\n> ❖ Alcanzó el límite, pero no pude expulsarlo (${err.message}).\n> ¿Soy administrador del grupo?`;
        }
      }
    }

    db.saveDatabase?.();
    return sock.sendMessage(
      from,
      {
        text:
          `⚖️ Advertencia para ${mencion(jid, db)}\n\n` +
          `│ Motivo: ${razon.slice(0, 200)}\n` +
          `│ Total: *${total}/${limite}*\n` +
          `│ Por: @${numeroDe(sender)}${extra}`,
        mentions: [jid, sender],
      },
      { quoted: m }
    );
  },
};
