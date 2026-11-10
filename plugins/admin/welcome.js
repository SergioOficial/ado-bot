import axios from "axios";

export default {
  command: ["welcome", "bienvenida"],
  execute: async (ctx) => {
    const { sock, from, args, isGroup, enviartexto, isOwnerCheck, sender, db, config } = ctx;

    // 🛡️ 1. ENGÄNCHAR EL EVENTO A LA MEMORIA
    if (!global._welcomeEventHooked) {
      global._welcomeEventHooked = true;

      sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action } = update;
        const database = global.db.data;

        if (!database.chats) database.chats = {};
        if (!database.chats[id]) database.chats[id] = {};
        const chat = database.chats[id];

        try {
          let groupName = "el grupo";
          try {
            const meta = await sock.groupMetadata(id);
            groupName = meta.subject;
          } catch (e) {
            console.log("No se pudo leer la metadata del grupo en welcome:", e.message);
          }

          for (const p of participants) {
            const jid = typeof p === "string" ? p : (p.id || p.jid || p.phoneNumber || "");
            if (!jid) continue;

            const num = String(jid).split("@")[0].split(":")[0];

            // 🟢 ENTRADA (BIENVENIDA CON IMAGEN)
            if (action === "add" && chat.welcome) {
              const customMsg = chat.welcomeMsg || "꧁༺ 💤 𝐋𝐄𝐕𝐈 𝐁𝐎𝐓 🌌 ༻꧂\n\n🎄 *¡Bienvenido/a @user!* 🎄\n\n*❒ Te damos la bienvenida a @group.*\n• Esperamos que disfrutes tu estadía.\n\n       ♪ ¡PÁSALA GENIAL!  \n\n> Usa #help para ver mis comandos \n🐾━━━━━━━━━━━━🐾";
              const text = String(customMsg).replace("@user", `@${num}`).replace("@group", groupName);

              // 📸 Obtener foto de perfil del usuario
              let userPfp = "https://i.pravatar.cc/300"; // Foto por defecto si no tiene
              try {
                const url = await sock.profilePictureUrl(jid, "image");
                if (url) userPfp = url;
              } catch (e) {}

              try {
                // 🎨 Llamar a la API para generar la imagen de bienvenida
                // ⚠️ CAMBIA "https://tu-dominio.com" POR TU URL REAL DE LA API
                const apiUrl = `https://natsu-api.darkcore.xyz/api/maker/welcome?foto=${encodeURIComponent(userPfp)}`;
                const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 15000 });
                const imageBuffer = Buffer.from(res.data, "binary");

                // Enviar la imagen con el texto de bienvenida
                await sock.sendMessage(id, { 
                  image: imageBuffer, 
                  caption: text, 
                  mentions: [jid] 
                }).catch(() => {});

              } catch (apiError) {
                // Si la API falla, envía solo el texto para no dejar a la persona sin bienvenida
                console.log("Error en API de bienvenida, enviando solo texto:", apiError.message);
                await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
              }
            }

            // 🔴 SALIDA (DESPEDIDA NORMAL)
            if (action === "remove" && chat.goodbye) {
              const customMsg = chat.goodbyeMsg || "Adiós @user, espero que vuelvas pronto 👋";
              const text = String(customMsg).replace("@user", `@${num}`).replace("@group", groupName);

              await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {
                console.log(`Error al enviar despedida al grupo ${id}.`);
              });
            }
          }
        } catch (e) {
          console.error("Error en evento welcome:", e.message || e);
        }
      });
      console.log("✅ Evento de Bienvenida (API) / Despedida enganchado a la memoria.");
    }

    // 🛡️ 2. CONFIGURACIÓN DEL COMANDO
    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    let isAdmin = false;
    try {
      const meta = await sock.groupMetadata(from);
      const adminIds = meta.participants
        .filter(pa => pa.admin !== null)
        .flatMap(pa => {
          const pid = typeof pa === "string" ? pa : (pa.id || pa.lid || pa.phoneNumber);
          return pid ? [String(pid)] : [];
        });

      isAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);
    } catch (e) {
      isAdmin = isOwnerCheck(sender, sock);
    }

    if (!isAdmin) {
      return enviartexto("⚠️ Solo los administradores pueden configurar esto.");
    }

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
      `👋 *CONFIGURACIÓN DE BIENVENIDA*\n\n` +
      `🟢 *Bienvenida:* ${chat.welcome ? "ON" : "OFF"}\n` +
      `🔴 *Despedida:* ${chat.goodbye ? "ON" : "OFF"}\n\n` +
      `⚙️ *Comandos:*\n` +
      `➤ ${config.prefix[0]}welcome on/off\n` +
      `➤ ${config.prefix[0]}welcome goodbye on/off\n` +
      `➤ ${config.prefix[0]}welcome set <texto>\n` +
      `➤ ${config.prefix[0]}welcome setgoodbye <texto>\n\n` +
      `_Puedes usar @user y @group._`
    );
  }
};
