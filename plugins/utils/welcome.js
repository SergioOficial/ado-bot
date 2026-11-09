export default {
  command: ["welcome", "bienvenida"],
  execute: async (ctx) => {
    const { sock, from, args, isGroup, enviartexto, isOwnerCheck, sender, db, config } = ctx;
    
    // 🛡️ 1. ENGÄNCHAR EL EVENTO A LA MEMORIA (Solo se ejecuta una vez)
    if (!sock.ev.listeners("group-participants.update").length) {
      sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action } = update;
        const database = global.db.data;
        
        if (!database.chats) database.chats = {};
        if (!database.chats[id]) database.chats[id] = {};
        const chat = database.chats[id];

        try {
          const meta = await sock.groupMetadata(id);
          const groupName = meta.subject;

          for (const jid of participants) {
            const num = String(jid).split("@")[0].split(":")[0];

            // Entrada
            if (action === "add" && chat.welcome) {
              const text = (chat.welcomeMsg || "¡Hola @user! Bienvenido a *@group* 🎉")
                .replace("@user", `@${num}`)
                .replace("@group", groupName);
              await sock.sendMessage(id, { text, mentions: [jid] });
            }

            // Salida
            if (action === "remove" && chat.goodbye) {
              const text = (chat.goodbyeMsg || "Adiós @user, espero que vuelvas pronto 👋")
                .replace("@user", `@${num}`)
                .replace("@group", groupName);
              await sock.sendMessage(id, { text, mentions: [jid] });
            }
          }
        } catch (e) {
          console.error("Error en evento welcome:", e.message);
        }
      });
      console.log("✅ Evento de Bienvenida/Despedida enganchado a la memoria.");
    }

    // 🛡️ 2. CONFIGURACIÓN DEL COMANDO
    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");
    
    const meta = await sock.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin !== null).flatMap(p => [p.id, p.lid]);
    if (!admins.includes(sender) && !isOwnerCheck(sender, sock)) return enviartexto("⚠️ Solo los administradores pueden configurar esto.");

    if (!db.chats[from]) db.chats[from] = {};
    const chat = db.chats[from];
    const action = args[0]?.toLowerCase();

    // Prender / Apagar Bienvenida
    if (action === "on" || action === "off") {
      chat.welcome = action === "on";
      return enviartexto(`✅ La *bienvenida* ha sido ${chat.welcome ? "ACTIVADA 🟢" : "DESACTIVADA 🔴"}.`);
    }

    // Prender / Apagar Despedida
    if (action === "goodbye" || action === "despedida") {
      const state = args[1]?.toLowerCase();
      if (state === "on" || state === "off") {
        chat.goodbye = state === "on";
        return enviartexto(`✅ La *despedida* ha sido ${chat.goodbye ? "ACTIVADA 🟢" : "DESACTIVADA 🔴"}.`);
      }
    }

    // Personalizar mensajes
    if (action === "set") {
      const text = args.slice(1).join(" ");
      if (!text) return enviartexto("⚠️ Escribe el mensaje usando *@user* y *@group*.");
      chat.welcomeMsg = text;
      return enviartexto(`✅ Mensaje de bienvenida actualizado.`);
    }

    if (action === "setgoodbye") {
      const text = args.slice(1).join(" ");
      if (!text) return enviartexto("⚠️ Escribe el mensaje usando *@user* y *@group*.");
      chat.goodbyeMsg = text;
      return enviartexto(`✅ Mensaje de despedida actualizado.`);
    }

    // Menú de ayuda
    return enviartexto(
      `👋 *CONFIGURACIÓN DE BIENVENIDA Y DESPEDIDA*\n\n` +
      `🟢 *Bienvenida:* ${chat.welcome ? "ON" : "OFF"}\n` +
      `🔴 *Despedida:* ${chat.goodbye ? "ON" : "OFF"}\n\n` +
      `⚙️ *Comandos:*\n` +
      `➤ ${config.prefix[0]}welcome on/off\n` +
      `➤ ${config.prefix[0]}welcome goodbye on/off\n` +
      `➤ ${config.prefix[0]}welcome set <texto>\n` +
      `➤ ${config.prefix[0]}welcome setgoodbye <texto>\n\n` +
      `_Puedes usar @user para el usuario y @group para el nombre del grupo._`
    );
  }
};