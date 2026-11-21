import fs from 'fs';
import path from 'path';
import { conns as connsImportados } from '../../boot/subbots.js'; // 👈 Intentamos importar directo

export default {
  command: ["bots", "sockets", "subbots"],
  category: "subbots",
  execute: async (ctx) => {
    const { sock, from, m, isGroup, db } = ctx;

    // 1. Obtener los sockets (probamos global.conns, luego el import, luego vacío)
    let listaSockets = global.conns || connsImportados || [];
    
    // Normalizar si es un Mapa o un Objeto
    if (listaSockets instanceof Map) listaSockets = Array.from(listaSockets.values());
    else if (typeof listaSockets === 'object' && !Array.isArray(listaSockets)) listaSockets = Object.values(listaSockets);

    const miJid = sock.user?.id || "";
    const miNumero = miJid.split('@')[0].split(':')[0];

    // 2. Armar la lista completa de bots (Subs + Principal)
    let todosLosBots = [];
    let numerosVistos = new Set();

    // Procesar los sub-bots en memoria
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

    // Asegurar que el bot principal esté en la lista
    if (!numerosVistos.has(miNumero)) {
      const userDb = db.users[`${miNumero}@s.whatsapp.net`] || {};
      todosLosBots.push({
        jid: `${miNumero}@s.whatsapp.net`,
        numero: miNumero,
        nombre: userDb.name || sock.user?.name || "Principal"
      });
      numerosVistos.add(miNumero);
    }

    // 3. Contar y clasificar para las estadísticas
    let principales = 0, premiums = 0, subs = 0;
    
    for (const b of todosLosBots) {
      const userDb = db.users[`${b.numero}@s.whatsapp.net`] || {};
      const esOwner = (db.settings?.owners || []).some(o => (o.number || o) === b.numero);
      
      if (b.numero === miNumero || esOwner) principales++;
      else if (userDb.premium) premiums++;
      else subs++;
    }

    // 4. Armar el texto bonito
    let texto = `ꕥ Números de Sockets activos *(${todosLosBots.length})*\n\n`;
    texto += `ੈ❖‧₊˚ Principales › *${principales}*\n`;
    texto += `ੈ✰︎︎‧₊˚ Premiums › *${premiums}*\n`;
    texto += `ੈ✿‧₊˚ Subs › *${subs}*\n\n\n`;

    // 5. Detectar cuáles están en el grupo actual
    const mentions = [];
    if (isGroup) {
      let botsEnGrupo = [];
      try {
        const metadata = await sock.groupMetadata(from);
        
        // Extraemos SOLO los números de los participantes para evitar fallos de formato (ej. @lid)
        const participantes = metadata.participants.map(p => p.id.split('@')[0].split(':')[0]);

        for (const b of todosLosBots) {
          if (participantes.includes(b.numero)) {
            botsEnGrupo.push(b);
          }
        }
      } catch (e) {
        console.error("Error al obtener metadata del grupo:", e);
      }

      // Ordenar para que el principal salga primero
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

    // 6. Enviar mensaje
    await sock.sendMessage(from, {
      text: texto.trim(),
      mentions: mentions
    }, { quoted: m });
  }
};