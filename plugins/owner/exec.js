import { exec } from "child_process";

export default {
  command: ["exec", "term", "cmd", "terminal", "npm"],
  isOwner: true, // 👈 Bloqueado para cualquiera que no sea Owner
  execute: async (ctx) => {
    const { enviartexto, args, comando, sock, from, m, config } = ctx;
    
    let cmd = args.join(" ").trim();
    
    if (!cmd) {
      return enviartexto(
        `💻 *EJECUTOR DE TERMINAL*\n\n` +
        `Uso: *${config.prefix[0]}exec <comando>*\n\n` +
        `Ejemplos:\n` +
        `➤ ${config.prefix[0]}exec npm install axios\n` +
        `➤ ${config.prefix[0]}exec ls -la\n` +
        `➤ ${config.prefix[0]}exec git pull\n\n` +
        `> Si usas *${config.prefix[0]}npm <paquete>*, se ejecutará automáticamente un "npm install".`
      );
    }

    // Si el usuario usó el comando .npm, le añadimos el "npm install" por defecto
    if (comando === "npm") {
      cmd = `npm install ${cmd}`;
    }

    await sock.sendMessage(from, { react: { text: "💻", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `⏳ *Ejecutando:* \`${cmd}\`...` }, { quoted: m });

    // Ejecutar el comando en la consola con un timeout de 60 segundos
    exec(cmd, { timeout: 60000, maxBuffer: 1024 * 1024 * 5 }, async (error, stdout, stderr) => {
      let resultado = "";
      
      if (stdout) {
        resultado += `*STDOUT:*\n\`\`\`\n${stdout.trim()}\n\`\`\`\n\n`;
      }
      
      if (stderr) {
        resultado += `*STDERR (Errores):*\n\`\`\`\n${stderr.trim()}\n\`\`\`\n\n`;
      }

      if (error) {
        resultado += `*CÓDIGO DE SALIDA:* ${error.code}\n`;
      }

      if (!resultado) {
        resultado = "✅ Comando ejecutado sin salida en consola.";
      }

      // Si el resultado es muy largo, lo recortamos para que WhatsApp no falle
      if (resultado.length > 3500) {
        resultado = resultado.slice(0, 3500) + "\n\n... (Recortado por límite de WhatsApp)";
      }

      // Editar el mensaje de "Ejecutando..." con la respuesta final
      await sock.sendMessage(from, { 
        text: `💻 *RESULTADO:*\n\n${resultado}`, 
        edit: waitMsg.key 
      }).catch(async () => {
        // Si la edición falla, envía un nuevo mensaje
        await enviartexto(`💻 *RESULTADO:*\n\n${resultado}`);
      });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    });
  }
};
