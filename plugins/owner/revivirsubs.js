import { numerosDeSubSesiones } from "../../lib/rutas.js";

export default {
  command: ["revivirsubs", "restarsubs", "activarsubs"],
  isOwner: true, // Solo tú puedes usarlo
  execute: async (ctx) => {
    const { sock, enviartexto, getActiveSubbots, startSubbot } = ctx;
    
    // Las sesiones salen de lib/rutas.js (antes la carpeta estaba escrita aquí a
    // mano, duplicada con .setprimary). `numerosDeSubSesiones` ya devuelve solo
    // las que tienen creds.json, o sea las vinculadas de verdad.
    const numeros = numerosDeSubSesiones();
    if (!numeros.length) {
      return enviartexto("❌ No hay sesiones de sub-bots vinculadas.");
    }

    const activos = Array.from(getActiveSubbots().keys());
    
    let revividos = 0;
    let fallidos = 0;
    let yaActivos = 0;

    await enviartexto("⏳ *Escaneando y reactivando sub-bots...*");

    for (const numero of numeros) {
      // Verificar si ya está encendido
      if (activos.includes(numero)) {
        yaActivos++;
        continue;
      }
      
      // Intentar levantar
      try {
        const destino = `${numero}@s.whatsapp.net`;
        const avisar = async (texto) => {
          try { await sock.sendMessage(destino, { text: texto }); } catch {}
        };
        
        await startSubbot(sock, destino, destino, avisar, "sesion");
        revividos++;
        
        // Pequeña pausa para no saturar la red
        await new Promise(r => setTimeout(r, 1500));
        
      } catch (e) {
        console.error(`Error reviviendo subbot ${numero}:`, e.message);
        fallidos++;
      }
    }
    
    const totalAhora = getActiveSubbots().size;

    const reporte = `
♻️ *REACTIVACIÓN DE SUB-BOTS*

┏━━━━━━━━━━━━━━━━━━┓
┃ ➤ *Ya estaban activos:* ${yaActivos}
┃ ➤ *Revividos ahora:* ${revividos}
┃ ➤ *Fallidos:* ${fallidos}
┗━━━━━━━━━━━━━━━━━━┛
    
✅ *Subbots activos en total:* ${totalAhora}
`.trim();

    await enviartexto(reporte);
  }
};