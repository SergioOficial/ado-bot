import fs from "fs";
import path from "path";

export default {
  command: ["revivirsubs", "restarsubs", "activarsubs"],
  isOwner: true, // Solo tú puedes usarlo
  execute: async (ctx) => {
    const { sock, enviartexto, getActiveSubbots, startSubbot } = ctx;
    
    // Ruta donde tu index.js guarda las sesiones
    const subDir = "./sub/SubBots"; 
    
    if (!fs.existsSync(subDir)) {
      return enviartexto("❌ No existe la carpeta de sesiones de subbots.");
    }

    const folders = fs.readdirSync(subDir);
    const activos = Array.from(getActiveSubbots().keys());
    
    let revividos = 0;
    let fallidos = 0;
    let yaActivos = 0;

    await enviartexto("⏳ *Escaneando y reactivando sub-bots...*");

    for (const folder of folders) {
      const credsPath = path.join(subDir, folder, "creds.json");
      
      // Si la carpeta no tiene credenciales, significa que no se vinculó bien
      if (!fs.existsSync(credsPath)) continue;
      
      const numero = folder.replace(/\D/g, ""); 
      if (!numero) continue;
      
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