/**
 * bots.js — Lista y estadísticas de los sockets activos.
 */

export default {
  command: ["bots", "sockets", "subbots"],
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db, enviartexto } = ctx;

    // 1. Obtener la lista de sockets conectados (sub-bots + principal)
    // En la mayoría de los bots con Baileys, se guardan en global.conns
    const conns = global.conns || global.subbots || [];
    
    // Si el bot principal no está en el array (a veces se maneja aparte), lo sumamos
    let totalSockets = conns.length;
    if (!conns.some(c => c.user?.id === sock.user?.id)) {
      totalSockets++; 
    }

    let principales = 0;
    let premiums = 0;
    let subs = 0;

    // 2. Clasificar los sockets
    for (const c of conns) {
      const jid = c.user?.id || c.user?.jid;
      if (!jid) continue;
      
      const numero = jid.split("@")[0].split(":")[0];
      const userDb = db.users[`${numero}@s.whatsapp.net`] || {};

      // Verificamos si es owner (principal) o si es premium
      const esOwner = (db.settings?.owners || []).some(o => (o.number || o) === numero);
      
      if (c.isMain || esOwner) {
        principales++;
      } else if (userDb.premium) {
        premiums++;
      } else {
        subs++;
      }
    }

    // Si somos el bot principal y no está en la lista, sumamos 1 a principales
    if (!conns.some(c => c.user?.id === sock.user?.id)) {
      principales++;
    }

    // 3. Construir el mensaje con el diseño solicitado
    let texto = `ꕥ Números de Sockets activos *(${totalSockets})*\n\n`;
    texto += `ੈ❖‧₊˚ Principales › *${principales}*\n`;
    texto += `ੈ✰︎︎‧₊˚ Premiums › *${premiums}*\n`;
    texto += `ੈ✿‧₊˚ Subs › *${subs}*\n\n\n`;

    // 4. Buscar bots en el grupo actual
    const mentions = [];
    if (isGroup) {
      let botsEnGrupo = [];

      try {
        const metadata = await sock.groupMetadata(from);
        const participantes = metadata.participants.map(p => p.id.split('@')[0].split(':')[0]);

        // Revisar la lista de conexiones
        for (const c of conns) {
          const jid = c.user?.id || c.user?.jid;
          if (!jid) continue;
          const numero = jid.split("@")[0].split(":")[0];

          if (participantes.includes(numero)) {
            botsEnGrupo.push({ jid: `${numero}@s.whatsapp.net`, socket: c, numero });
          }
        }

        // Revisar si el bot principal (yo) está en el grupo (siempre lo está si ejecuto el comando)
        const numeroYo = sock.user.id.split("@")[0].split(":")[0];
        if (!botsEnGrupo.some(b => b.numero === numeroYo)) {
          botsEnGrupo.push({ jid: `${numeroYo}@s.whatsapp.net`, socket: sock, numero: numeroYo, esYo: true });
        }

      } catch (e) {
        console.error("Error al obtener metadata del grupo:", e);
      }

      texto += `➭ *Bots en el grupo ›* ${botsEnGrupo.length}\n`;
      
      if (botsEnGrupo.length === 0) {
        texto += `> _No hay otros bots en este grupo._`;
      } else {
        for (const b of botsEnGrupo) {
          const userDb = db.users[b.jid] || {};
          const pushName = b.socket?.user?.name || userDb.name || "Desconocido";
          
          // Si el bot es un sub-bot, mostramos la etiqueta [Sub]
          const esSub = !b.esYo && !b.socket?.isMain && !(db.settings?.owners || []).some(o => (o.number||o) === b.numero);
          const etiqueta = esSub ? "Sub *" + pushName + "*" : (pushName || "Principal");
          
          texto += `- [${etiqueta}] › @${b.numero}\n`;
          mentions.push(b.jid);
        }
      }
    } else {
      texto += `➭ *Bots en el grupo ›* 0\n> _Este comando es mejor usarlo en un grupo._`;
    }

    // 5. Enviar el mensaje con las menciones correctas para que WhatsApp pinte los @numero
    await sock.sendMessage(from, {
      text: texto.trim(),
      mentions: mentions
    }, { quoted: m });
  }
};