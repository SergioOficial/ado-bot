import fs from "fs";
import path from "path";

export default {
  command: ["setprimary", "primary"],
  isAdmin: true,
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db, jidToNumber } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctxInfo?.mentionedJid?.[0];
    const quotedSender = ctxInfo?.participant;
    const who2 = mentioned || quotedSender;

    if (!who2) return enviartexto("《✧》 Por favor menciona un bot para convertirlo en primario.");

    const who = jidToNumber(who2) + "@s.whatsapp.net";

    const subDir = "./sub/SubBots"; 
    let subBots = [];
    if (fs.existsSync(subDir)) {
      const dirs = fs.readdirSync(subDir);
      subBots = dirs.filter(dir => fs.existsSync(path.join(subDir, dir, "creds.json"))).map(dir => dir + "@s.whatsapp.net");
    }

    const mainBotJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    const allowedBots = [...new Set([...subBots, mainBotJid])];

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