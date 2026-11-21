import fs from 'fs';
import path from 'path';

export default {
  command: ["bots", "sockets", "subbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db } = ctx;

    const miJid = sock.user?.id || "";
    const miNumero = miJid.split('@')[0].split(':')[0];

    let listaBots = [];

    // 1. Intentar leer de memoria (por si el núcleo los tiene en global)
    const rawConns = global.conns || global.subbots || [];
    let connsMemoria = [];
    if (rawConns instanceof Map) connsMemoria = Array.from(rawConns.values());
    else if (Array.isArray(rawConns)) connsMemoria = rawConns;
    else if (typeof rawConns === 'object') connsMemoria = Object.values(rawConns);

    // Agregar los que están en memoria
    for (const c of connsMemoria) {
      const jid = c.user?.id || c.user?.jid;
      if (jid && !listaBots.some(b => b.jid === jid)) {
        listaBots.push({ jid, nombre: c.user?.name || c.user?.verifiedName || "Desconocido", source: 'memoria' });
      }
    }

    // 2. Escanear la carpeta ./subs por si hay sub-bots guardados en disco
    const subsDir = path.resolve('./subs');
    if (fs.existsSync(subsDir)) {
      try {
        const carpetas = fs.readdirSync(subsDir);
        for (const carpeta of carpetas) {
          // Verificar si es un directorio (número de teléfono)
          const stat = fs.statSync(path.join(subsDir, carpeta));
          if (stat.isDirectory()) {
            const credsPath = path.join(subsDir, carpeta, 'creds.json');
            if (fs.existsSync(credsPath)) {
              const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
              if (creds.me && creds.me.id) {
                const jid = creds.me.id;
                const numero = jid.split('@')[0].split(':')[0];
                
                // Evitar duplicados si ya estaba en memoria
                if (!listaBots.some(b => b.jid.includes(numero))) {
                  const userDb = db.users[`${numero}@s.whatsapp.net`] || {};
                  listaBots.push({ 
                    jid: `${numero}@s.whatsapp.net`, 
                    nombre: userDb.name || creds.me.name || "Sub-Bot",
                    source: 'disco' 
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error leyendo carpeta subs:", e);
      }
    }

    // 3. Agregar al bot principal si no está en la lista
    if (miNumero && !listaBots.some(b => b.jid.includes(miNumero))) {
      const userDb = db.users[`${miNumero}@s.whatsapp.net`] || {};
      listaBots.push({ 
        jid: `${miNumero}@s.whatsapp.net`, 
        nombre: userDb.name || sock.user?.name || "Principal",
        source: 'main' 
      });
    }

    // 4. Clasificar y contar (Principales, Premiums, Subs)
    let totalSockets = listaBots.length;
    let principales = 0, premiums = 0, subs = 0;

    for (const b of listaBots) {
      const numero = b.jid.split("@")[0].split(":")[0];
      const userDb = db.users[`${numero}@s.whatsapp.net`] || {};
      const esOwner = (db.settings?.owners || []).some(o => (o.number || o) === numero);

      if (numero === miNumero || esOwner) {
        principales++;
      } else if (userDb.premium) {
        premiums++;
      } else {
        subs++;
      }
    }

    // 5. Armar el texto principal
    let texto = `ꕥ Números de Sockets activos *(${totalSockets})*\n\n`;
    texto += `ੈ❖‧₊˚ Principales › *${principales}*\n`;
    texto += `ੈ✰︎︎‧₊˚ Premiums › *${premiums}*\n`;
    texto += `ੈ✿‧₊˚ Subs › *${subs}*\n\n\n`;

    // 6. Filtrar los que están en el grupo actual
    const mentions = [];
    if (isGroup) {
      let botsEnGrupo = [];
      try {
        const metadata = await sock.groupMetadata(from);
        const participantes = metadata.participants.map(p => p.id.split('@')[0].split(':')[0]);

        for (const b of listaBots) {
          const numero = b.jid.split("@")[0].split(":")[0];
          if (participantes.includes(numero)) {
            botsEnGrupo.push(b);
          }
        }
      } catch (e) {
        console.error("Error al obtener metadata del grupo:", e);
      }

      // Ordenar para que el bot principal salga primero
      botsEnGrupo.sort((a, b) => (a.jid.includes(miNumero) ? -1 : 1));

      texto += `➭ *Bots en el grupo ›* ${botsEnGrupo.length}\n`;
      
      if (botsEnGrupo.length === 0) {
        texto += `> _No hay otros bots en este grupo._`;
      } else {
        for (const b of botsEnGrupo) {
          const numero = b.jid.split("@")[0];
          const esSub = !b.jid.includes(miNumero);
          const etiqueta = esSub ? `Sub *${b.nombre}*` : `Principal *${b.nombre}*`;
          
          texto += `- [${etiqueta}] › @${numero}\n`;
          mentions.push(b.jid);
        }
      }
    } else {
      texto += `➭ *Bots en el grupo ›* 0\n> _Usa este comando en un grupo._`;
    }

    // 7. Enviar el mensaje con menciones
    await sock.sendMessage(from, {
      text: texto.trim(),
      mentions: mentions
    }, { quoted: m });
  }
};