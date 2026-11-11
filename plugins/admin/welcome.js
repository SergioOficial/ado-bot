import axios from "axios";

export default {
  command: ["welcome", "bienvenida"],
  execute: async (ctx) => {
    const { sock, from, args, isGroup, enviartexto, isOwnerCheck, sender, db, config } = ctx;

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
          } catch (e) {}

          for (const p of participants) {
            const jid = typeof p === "string" ? p : (p.id || p.jid || p.phoneNumber || "");
            if (!jid) continue;

            const num = String(jid).split("@")[0].split(":")[0];

            if (action === "add" && chat.welcome) {
              const customMsg = chat.welcomeMsg || "꧁༺ 💤 𝐀𝐃𝐎 𝐁𝐎𝐓 🌌 ༻꧂\n\n🎄 *¡Bienvenido/a @user!* 🎄\n\n*❒ Te damos la bienvenida a @group.*\n• Esperamos que disfrutes tu estadía.\n\n       ♪ ¡PÁSALA GENIAL!  \n\n> Usa #help para ver mis comandos \n🐾━━━━━━━━━━━━🐾";
              const text = String(customMsg).replace("@user", `@${num}`).replace("@group", groupName);

              let userPfp = "https://i.pravatar.cc/300"; 
              try {
                const url = await sock.profilePictureUrl(jid, "image");
                if (url) userPfp = url;
              } catch (e) {}

              try {
                const apiUrl = `https://novita-api.darkcore.xyz/api/maker/welcome2?foto=${encodeURIComponent(userPfp)}&tema=azul`;
                
                const res = await axios.get(apiUrl, { 
                  responseType: "arraybuffer", 
                  timeout: 20000,
                  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                });
                
                const imageBuffer = Buffer.from(res.data);

                await sock.sendMessage(id, { 
                  image: imageBuffer, 
                  caption: text, 
                  mentions: [jid] 
                });

              } catch (apiError) {
                console.log(`❌ Error con la API de Novita: ${apiError.message}`);
                
                const fallbackImage = "https://tse2.mm.bing.net/th/id/OIP.qoxIHiufIGEW45rXleS98gHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3&tema=rosa";
                
                try {
                  await sock.sendMessage(id, { 
                    image: { url: fallbackImage }, 
                    caption: text, 
                    mentions: [jid] 
                  });
                } catch (e) {
                  await sock.sendMessage(id, { text, mentions: [jid] });
                }
              }
            }

            if (action === "remove" && chat.goodbye) {
              const customMsg = chat.goodbyeMsg || "Adiós @user, espero que vuelvas pronto 👋";
              const text = String(customMsg).replace("@user", `@${num}`).replace("@group", groupName);
              await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
            }
          }
        } catch (e) {
          console.error("Error en evento welcome:", e.message || e);
        }
      });
    }

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    let isAdmin = false;
    try {
      const meta = await sock.groupMetadata(from);
      const adminIds = meta.participants.filter(pa => pa.admin !== null).flatMap(pa => {
        const pid = typeof pa === "string" ? pa : (pa.id || pa.lid || pa.phoneNumber);
        return pid ? [String(pid)] : [];
      });

      isAdmin = adminIds.includes(sender) || isOwnerCheck(sender, sock);
    } catch (e) {
      isAdmin = isOwnerCheck(sender, sock);
    }

    if (!isAdmin) return enviartexto("⚠️ Solo los administradores pueden configurar esto.");

    if (!db.chats[from]) db.chats[from] = {};
    const chat = db.chats[from];
    const action = args[0]?.toLowerCase();

    if (action === "on" || action === "off") {
      chat.welcome = action === "on";
      return enviartexto(`✅ La *bienvenida* ha sido ${chat.welcome ? "ACTIVADA 🟢" : "DESACTIVADA 🔴"}.`);
    }

    if (action === "goodbye" || action === "despedida") {
      const state = args[1]?.toLowerCase();
      if (state === "on" || state === "off") {
        chat.goodbye = state === "on";
        return enviartexto(`✅ La *despedida* ha sido ${chat.goodbye ? "ACTIVADA 🟢" : "DESACTIVADA 🔴"}.`);
      }
    }

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

    return enviartexto(
      `👋 *CONFIGURACIÓN DE BIENVENIDA*\n\n` +
      `🟢 *Bienvenida:* ${chat.welcome ? "ON" : "OFF"}\n` +
      `🔴 *Despedida:* ${chat.goodbye ? "ON" : "OFF"}\n\n` +
      `⚙️ *Comandos:*\n` +
      `➤ ${config.prefix[0]}welcome on/off\n` +
      `➤ ${config.prefix[0]}welcome goodbye on/off\n` +
      `➤ ${config.prefix[0]}welcome set <texto>\n` +
      `➤ ${config.prefix[0]}welcome setgoodbye <texto>`
    );
  }
};