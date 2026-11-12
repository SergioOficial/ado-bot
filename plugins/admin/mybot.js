export default {
  command: ["mybot", "bot2", "togglebot"],
  execute: async (ctx) => {
    const { sock, from, m, args, isGroup, sender, isOwnerCheck, db, enviartexto, jidToNumber, getTargetFromMsg } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    // 1. Verificar permisos (Admin del grupo o Owner del bot)
    let isAdmin = false;
    try {
      const meta = await sock.groupMetadata(from);
      const adminIds = meta.participants.filter(pa => pa.admin !== null).flatMap(pa => {
        const pid = typeof pa === "string" ? pa : (pa.id || pa.lid || pa.phoneNumber);
        return pid ? [String(pid)] : [];
      });
      isAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);
    } catch (e) {
      isAdmin = isOwnerCheck(sender, sock);
    }

    if (!isAdmin) return enviartexto("⚠️ Solo los administradores o el owner pueden usar esto.");

    // 2. Determinar a qué bot afectar
    const botActualJid = jidToNumber(sock.user.id) + "@s.whatsapp.net";
    let targetBot = botActualJid; // Por defecto, apaga el bot que recibe el mensaje

    // Si el usuario menciona a otro bot (ej. .bot2 @subbot off)
    const { jid: mentionedJid } = getTargetFromMsg(m, args);
    if (mentionedJid) {
      targetBot = jidToNumber(mentionedJid) + "@s.whatsapp.net";
    }

    // 3. Leer la acción (on/off)
    const action = args.find(a => a.toLowerCase() === "on" || a.toLowerCase() === "off");
    if (!action) return enviartexto(`⚙️ Uso: *${ctx.PREFIX}mybot on* o *${ctx.PREFIX}bot2 @subbot off*`);

    const estado = action.toLowerCase() === "on";

    // 4. Guardar en la base de datos
    if (!db.chats[from]) db.chats[from] = {};
    if (!db.chats[from].botsApagados) db.chats[from].botsApagados = {};

    db.chats[from].botsApagados[targetBot] = !estado; // true = apagado, false = encendido

    const esMismoBot = targetBot === botActualJid;
    const nombre = esMismoBot ? "Este bot" : `El bot @${jidToNumber(targetBot)}`;

    if (estado) {
      await sock.sendMessage(from, { text: `✅ ${nombre} ha sido *ACTIVADO* en este grupo.`, mentions: [targetBot] }, { quoted: m });
    } else {
      await sock.sendMessage(from, { text: `🛑 ${nombre} ha sido *APAGADO* en este grupo.\n_Usa el mismo comando con "on" para volver a encenderlo._`, mentions: [targetBot] }, { quoted: m });
    }
  }
};