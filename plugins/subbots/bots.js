export default {
  command: ["bots", "sockets", "subbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db, enviartexto } = ctx;

    // 1. Obtener la lista de sockets de forma segura (soporta Array, Objeto o Map)
    const rawConns = global.conns || global.subbots || [];
    let conns = [];
    if (rawConns instanceof Map) conns = Array.from(rawConns.values());
    else if (Array.isArray(rawConns)) conns = rawConns;
    else if (typeof rawConns === 'object') conns = Object.values(rawConns);

    const miJid = sock.user?.id || sock.user?.jid;
    const miNumero = miJid.split('@')[0].split(':')[0];

    // Si el bot actual (principal) no está en el array, lo agregamos para contarlo
    if (!conns.some(c => (c.user?.id || c.user?.jid)?.includes(miNumero))) {
      conns.push({ user: sock.user, isMain: true, socket: sock });
    }

    let totalSockets = conns.length;
    let principales = 0;
    let premiums = 0;
    let subs = 0;

    // 2. Clasificar los sockets
    for (const c of conns) {
      const jid = c.user?.id || c.user?.jid || "";
      if (!jid) continue;
      const numero = jid.split("@")[0].split(":")[0];
      const userDb = db.users[`${numero}@s.whatsapp.net`] || {};

      // Comprobar si es Owner/Principal (revisando config.owners o isMain)
      const esOwner = (db.settings?.owners || []).some(o => (o.number || o) === numero);
      
      if (c.isMain || esOwner) {
        principales++;
      } else if (userDb.premium) {
        premiums++;
      } else {
        subs++;
      }
    }

    // 3. Construir el mensaje con el diseño solicitado
    let texto = `ꕥ Números de Sockets activos *(${totalSockets})*\n\n`;
    texto += `❖‧₊˚ Principales › *${principales}*\n`;
    texto += `✰︎︎‧₊˚ Premiums › *${premiums}*\n`;
    texto += `✿‧₊˚ Subs › *${subs}*\n\n\n`;

    // 4. Buscar bots en el grupo actual
    const mentions = [];
    if (isGroup) {
      let botsEnGrupo = [];

      try {
        const metadata = await sock.groupMetadata(from);
        const participantes = metadata.participants.map(p => p.id.split('@')[0].split(':')[0]);

        for (const c of conns) {
          const jid = c.user?.id || c.user?.jid || "";
          if (!jid) continue;
          const numero = jid.split("@")[0].split(":")[0];

          if (participantes.includes(numero)) {
            botsEnGrupo.push({ jid: `${numero}@s.whatsapp.net`, socket: c, numero });
          }
        }
      } catch (e) {
        console.error("Error al obtener metadata del grupo:", e);
      }

      // Ordenar para que el bot actual salga primero
      botsEnGrupo.sort((a, b) => (a.numero === miNumero ? -1 : 1));

      texto += `➭ *Bots en el grupo ›* ${botsEnGrupo.length}\n`;
      
      if (botsEnGrupo.length === 0) {
        texto += `> _No hay otros bots en este grupo._`;
      } else {
        for (const b of botsEnGrupo) {
          // Intentar sacar el nombre de la DB, del perfil de WhatsApp, o poner su número
          const userDb = db.users[b.jid] || {};
          const pushName = userDb.name || b.socket?.user?.name || b.socket?.user?.verifiedName || "Desconocido";
          
          // Si es el bot actual, se marca como [Principal], si no, como [Sub]
          const esSub = b.numero !== miNumero;
          const etiqueta = esSub ? `Sub *${pushName}*` : `Principal *${pushName}*`;
          
          texto += `- [${etiqueta}] › @${b.numero}\n`;
          mentions.push(b.jid);
        }
      }
    } else {
      texto += `➭ *Bots en el grupo ›* 0\n> _Usa este comando en un grupo para ver los bots presentes._`;
    }

    // 5. Enviar el mensaje con las menciones correctas
    await sock.sendMessage(from, {
      text: texto.trim(),
      mentions: mentions
    }, { quoted: m });
  }
};