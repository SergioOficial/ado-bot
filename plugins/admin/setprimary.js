import fs from "fs";
import path from "path";

export default {
  command: ["setprimary", "primary"],
  execute: async (ctx) => {
    const { sock, from, m, sender, isGroup, enviartexto, db, jidToNumber } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    // 🔍 Obtener el JID del mencionado o citado
    const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctxInfo?.mentionedJid?.[0];
    const quotedSender = ctxInfo?.participant;
    const whoRaw = mentioned || quotedSender;

    if (!whoRaw) return enviartexto("《✧》 Por favor menciona un bot para convertirlo en primario.");

    // 🕵️‍♂️ RESOLVER LID A NÚMERO REAL
    const meta = await sock.groupMetadata(from);
    let who = null;

    // 1. Buscar el JID en los participantes usando múltiples comparaciones
    const targetNum = jidToNumber(whoRaw);
    for (const p of meta.participants) {
      const candidates = [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean);
      for (const c of candidates) {
        if (c === whoRaw || jidToNumber(c) === targetNum) {
          // Encontramos la coincidencia, usamos el phoneNumber o id real
          const realJid = p.phoneNumber || p.id || p.jid;
          if (realJid && !realJid.includes('@lid')) {
            who = jidToNumber(realJid) + "@s.whatsapp.net";
            break;
          }
        }
      }
      if (who) break;
    }

    // 2. Si no encontramos coincidencia y parece LID, intentar resolver con onWhatsApp
    if (!who && whoRaw.includes("@lid")) {
      try {
        const result = await sock.onWhatsApp(whoRaw);
        if (result && result[0] && result[0].jid) {
          who = result[0].jid;
        }
      } catch (e) {
        console.log("No se pudo resolver el LID con onWhatsApp");
      }
    }

    // 3. Fallback: usar el JID raw (por si es un número normal)
    if (!who) {
      who = jidToNumber(whoRaw) + "@s.whatsapp.net";
    }

    // 📁 Leer las sesiones de subbots
    const subDir = "./sub/SubBots";
    let subBots = [];
    if (fs.existsSync(subDir)) {
      const dirs = fs.readdirSync(subDir);
      subBots = dirs
        .filter(dir => fs.existsSync(path.join(subDir, dir, "creds.json")))
        .map(dir => dir.replace(/\D/g, "") + "@s.whatsapp.net");
    }

    const mainBotJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    const allowedBots = [...new Set([...subBots, mainBotJid])];

    // ✅ Verificar si el mencionado es un subbot o el bot principal
    const whoNum = jidToNumber(who);
    const esBotValido = allowedBots.some(b => jidToNumber(b) === whoNum);

    if (!esBotValido) {
      return enviartexto(`《✧》 El usuario mencionado no es una instancia de Sub-Bot válida.\n\n> Detectado: @${whoNum}`, { mentions: [who] });
    }

    // 📊 Verificar que el bot esté en el grupo
    const participants = meta.participants.map(p => 
      jidToNumber(p.id || p.lid || p.phoneNumber)
    );
    
    if (!participants.includes(whoNum)) {
      return enviartexto(`《✧》 El bot mencionado no está presente en este grupo.`);
    }

    // 🎯 Guardar como bot primario
    if (!db.chats[from]) db.chats[from] = {};
    const chat = db.chats[from];
    
    if (chat.primaryBot === who) {
      return sock.sendMessage(from, { 
        text: `「✿」 @${whoNum} ya es el Bot principal del Grupo.`, 
        mentions: [who] 
      }, { quoted: m });
    }

    chat.primaryBot = who;
    await sock.sendMessage(from, { 
      text: `ꕥ Se ha establecido a @${whoNum} como bot primario de este grupo.\n> Ahora todos los comandos de este grupo serán ejecutados por @${whoNum}.`, 
      mentions: [who] 
    }, { quoted: m });
  }
};