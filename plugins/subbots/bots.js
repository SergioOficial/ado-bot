import fs from 'fs';
import path from 'path';

export default {
  command: ["bots", "sockets", "subbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db } = ctx;

    // 1. Intentar importar boot/subbots.js de forma segura para que no explote si el nombre de la variable cambia
    let listaSockets = [];
    
    try {
      // 👈 Ruta corregida: sube dos niveles (../../) para llegar a la raíz
      const bootModule = await import('../../boot/subbots.js');
      listaSockets = bootModule.conns || bootModule.subbots || bootModule.sockets || bootModule.default || [];
    } catch (e) {
      // Si falla la importación, no hacemos nada, usaremos global.conns abajo
    }

    // 2. Si la importación no trajo nada, usamos global.conns (el estándar de Baileys)
    if (!listaSockets || listaSockets.length === 0) {
      listaSockets = global.conns || global.subbots || [];
    }

    // Normalizar si es un Mapa o un Objeto
    if (listaSockets instanceof Map) listaSockets = Array.from(listaSockets.values());
    else if (typeof listaSockets === 'object' && !Array.isArray(listaSockets)) listaSockets = Object.values(listaSockets);

    const miJid = sock.user?.id || "";
    const miNumero = miJid.split('@')[0].split(':')[0];

    // 3. Armar la lista completa de bots (Subs + Principal)
    let todosLosBots = [];
    let numerosVistos = new Set();

    for (const c of listaSockets) {
      if (!c || !c.user) continue;
      const jidReal = c.user.id || c.user.jid;
      if (!jidReal) continue;
      
      const numero = jidReal.split('@')[0].split(':')[0];
      if (numerosVistos.has(numero)) continue;
      
      const userDb = db.users[`${numero}@s.whatsapp.net`] || {};
      todosLosBots.push({
        jid: `${numero}@s.whatsapp.net`,
        numero: numero,
        nombre: userDb.name || c.user.name || c.user.verifiedName || "Sub-Bot"
      });
      numerosVistos.add(numero);
    }

    // Asegurar que el bot principal (yo) esté en la lista
    if (!numerosVistos.has(miNumero)) {
      const userDb = db.users[`${miNumero}@s.whatsapp.net`] || {};
      todosLosBots.push({
        jid: `${miNumero}@s.whatsapp.net`,
        numero: miNumero,
        nombre: userDb.name || sock.user?.name || "Principal"
      });
      numerosVistos.add(miNumero);
    }

    // 4. Contar y clasificar
    let principales = 0, premiums = 0, subs = 0;
    for (const b of todosLosBots) {
      const userDb = db.users[`${b.numero}@s.whatsapp.net`] || {};
      const esOwner = (db.settings?.owners || []).some(o => (o.number || o) === b.numero);
      
      if (b.numero === miNumero || esOwner) principales++;
      else if (userDb.premium) premiums++;
      else subs++;
    }

    // 5. Armar el texto
    let texto = `ꕥ Números de Sockets activos *(${todosLosBots.length})*\n\n`;
    texto += `ੈ❖‧₊˚ Principales › *${principales}*\n`;
    texto += `ੈ✰︎︎‧₊˚ Premiums › *${premiums}*\n`;
    texto += `ੈ✿‧₊˚ Subs › *${subs}*\n\n\n`;

    // 6. Detectar bots en el grupo
    const mentions = [];
    if (isGroup) {
      let botsEnGrupo = [];
      try {
        const metadata = await sock.groupMetadata(from);
        const participantes = metadata.participants.map(p => p.id.split('@')[0].split(':')[0]);

        for (const b of todosLosBots) {
          if (participantes.includes(b.numero)) {
            botsEnGrupo.push(b);
          }
        }
      } catch (e) {
        console.error("Error al obtener metadata del grupo:", e);
      }

      botsEnGrupo.sort((a, b) => (a.numero === miNumero ? -1 : 1));

      texto += `➭ *Bots en el grupo ›* ${botsEnGrupo.length}\n`;
      
      if (botsEnGrupo.length === 0) {
        texto += `> _No hay otros bots en este grupo._`;
      } else {
        for (const b of botsEnGrupo) {
          const esSub = b.numero !== miNumero;
          const etiqueta = esSub ? `Sub *${b.nombre}*` : `Principal *${b.nombre}*`;
          
          texto += `- [${etiqueta}] › @${b.numero}\n`;
          mentions.push(b.jid);
        }
      }
    } else {
      texto += `➭ *Bots en el grupo ›* 0\n> _Usa este comando en un grupo._`;
    }

    // 7. Enviar mensaje
    await sock.sendMessage(from, {
      text: texto.trim(),
      mentions: mentions
    }, { quoted: m });
  }
};