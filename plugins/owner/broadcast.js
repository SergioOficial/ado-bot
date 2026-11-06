export default {
  command: ["bc", "broadcast", "difundir"],
  isOwner: true, // 👈 Solo los owners pueden usarlo
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, db, config } = ctx;
    const text = args.join(" ").trim();

    if (!text) {
      return enviartexto(`📢 *Uso:* Escribe el mensaje que quieres difundir a todos los chats.\nEjemplo: ${config.prefix}bc Mantenimiento en 10 minutos.`);
    }

    // Obtenemos todos los IDs de los usuarios registrados en la base de datos
    const users = Object.keys(db.users || {});

    if (users.length === 0) {
      return enviartexto("⚠️ No hay usuarios registrados en la base de datos para difundir.");
    }

    await sock.sendMessage(from, { react: { text: "📢", key: m.key } });
    await enviartexto(`🚀 *Iniciando difusión a ${users.length} chats...*\n_Esto puede tardar un poco, por favor espera._`);

    let enviados = 0;
    let fallidos = 0;

    for (let id of users) {
      try {
        // Delay de 5 segundos entre cada mensaje para evitar baneos (Spam)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await sock.sendMessage(id, { 
          text: `*📢 𝐃𝐈𝐅𝐔𝐒𝐈Ó𝐍 𝐎𝐅𝐈𝐂𝐈𝐀𝐋*\n\n${text}\n\n> ${config.botName}` 
        });
        
        enviados++;
      } catch (err) {
        console.error(`❌ Error al enviar difusión a ${id}:`, err.message);
        fallidos++;
      }
    }

    await enviartexto(`✅ *Difusión completada.*\n\n> Enviados: *${enviados}*\n> Fallidos: *${fallidos}*`);
  },
};
