import fs from "fs";
import path from "path";
import { subSesiones } from "../../lib/rutas.js";
export default {
  command: ["bots", "sockets", "listsubbots", "subbots"],
  execute: async (ctx) => {
    const { sock, from, m, isGroup, jidToNumber, loadSubConfig, BOT_NAME } = ctx;
    const mainJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    let parts = [];
    if (isGroup) { const meta = await sock.groupMetadata(from).catch(()=>null); if (meta) parts = meta.participants.map(p => jidToNumber(p.id) + "@s.whatsapp.net"); }
    const subs = subSesiones();
    const mentions = [], owner = [], subList = [];
    if (!isGroup || parts.includes(mainJid)) { mentions.push(mainJid); owner.push(`- [Owner *${sock.subconfig?.botname || BOT_NAME}*] › @${jidToNumber(mainJid)}`); }
    subs.forEach(num => { const subJid = num + "@s.whatsapp.net"; if (!isGroup || parts.includes(subJid)) { mentions.push(subJid); subList.push(`- [Sub *${loadSubConfig(num).botname || "Sub"}*] › @${num}`); } });
    let msg = `ꕥ *Bots activos:* ${1 + subs.length}\n\n➭ *En el grupo:* ${owner.length + subList.length}\n${owner.join('\n')}\n${subList.join('\n')}`;
    await sock.sendMessage(from, { text: msg.trim(), mentions }, { quoted: m });
  }
};
