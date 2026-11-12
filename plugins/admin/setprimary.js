import fs from "fs";
import path from "path";
import { SUB_SESIONES, subSesiones } from "../../lib/rutas.js";

export default {
  command: ["setprimary", "primary"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db, jidToNumber, getActiveSubbots, args } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctxInfo?.mentionedJid?.[0];
    const quotedSender = ctxInfo?.participant;
    let who2 = mentioned || quotedSender;

    // Sin mención: aceptar el número como argumento (.setprimary 5354386852).
    if (!who2 && args?.[0]) {
      const num = String(args[0]).replace(/\D/g, "");
      if (num) who2 = `${num}@s.whatsapp.net`;
    }

    if (!who2) return enviartexto("《✧》 Por favor menciona un bot para convertirlo en primario.");

    // Si la mención viene como LID, resolverla a número de teléfono.
    if (String(who2).endsWith("@lid")) {
      try {
        const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(who2);
        if (pn) who2 = pn;
      } catch {}
    }

    const who = jidToNumber(who2) + "@s.whatsapp.net";

    // Sub-bots activos en memoria (los conectados ahora mismo).
    let activos = [];
    try {
      const mapa = getActiveSubbots?.();
      if (mapa) activos = [...mapa.keys()];
    } catch {}

    // Más los que tienen sesión guardada (aunque estén desconectados).
    let guardados = [];
    try {
      guardados = subSesiones();
    } catch {
      try {
        if (fs.existsSync(SUB_SESIONES)) {
          guardados = fs.readdirSync(SUB_SESIONES).filter((d) => fs.existsSync(path.join(SUB_SESIONES, d, "creds.json")));
        }
      } catch {}
    }

    const mainBotJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    const allowedBots = [...new Set([...activos, ...guardados].map((n) => jidToNumber(n) + "@s.whatsapp.net").concat(mainBotJid))];

    if (!allowedBots.includes(who)) {
      return enviartexto(`《✧》 El usuario mencionado no es una instancia de Sub-Bot.`);
    }

    const meta = await sock.groupMetadata(from);
    const participants = meta.participants.map(p => jidToNumber(p.id || p.lid || p.phoneNumber) + "@s.whatsapp.net");

    if (!participants.includes(who)) {
      return enviartexto(`《✧》 El bot mencionado no está presente en este grupo.`);
    }

    if (!db.chats) db.chats = {};
    const chat = (db.chats[from] ??= {});
    if (chat.primaryBot === who) {
      return sock.sendMessage(from, { text: `「✿」 @${jidToNumber(who)} ya es el Bot principal del Grupo.`, mentions: [who] }, { quoted: m });
    }

    chat.primaryBot = who;
    await sock.sendMessage(from, {
      text: `ꕥ Se ha establecido a @${jidToNumber(who)} como bot primario de este grupo.\n> Ahora todos los comandos de este grupo serán ejecutados por @${jidToNumber(who)}.`,
      mentions: [who]
    }, { quoted: m });
  }
};
