export default {
  command: ["testwelcome", "testbienvenida", "probarwelcome"],
  execute: async (ctx) => {
    const { sock, from, sender, isGroup, enviartexto, db, config } = ctx;

    if (!isGroup) return enviartexto("⚠️ Este comando solo funciona en grupos.");

    try {
      // Obtener configuración del grupo
      const chat = db.chats[from] || {};
      
      // Datos simulados
      const groupName = (await sock.groupMetadata(from)).subject || "Este Grupo";
      const num = sender.split("@")[0];
      
      // Usar el mensaje guardado o el por defecto
      const customMsg = chat.welcomeMsg || "꧁༺ 💤 𝐋𝐄𝐕𝐈 𝐁𝐎𝐓 🌌 ༻꧂\n\n🎄 *¡Bienvenido/a @user!* 🎄\n\n*❒ Te damos la bienvenida a @group.*\n• Esperamos que disfrutes tu estadía.\n\n       ♪ ¡PÁSALA GENIAL!  \n\n> Usa #help para ver mis comandos \n🐾━━━━━━━━━━━━🐾";
      
      const text = String(customMsg).replace("@user", `@${num}`).replace("@group", groupName);

      // 🖼️ La misma imagen de Bing
      const welcomeImage = "https://tse2.mm.bing.net/th/id/OIP.qoxIHiufIGEW45rXleS98gHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3&tema=rosa";

      await enviartexto("🧪 *Simulando entrada al grupo...*");

      // Enviar el mensaje
      await sock.sendMessage(from, { 
        image: { url: welcomeImage }, 
        caption: text, 
        mentions: [sender] 
      });

      await sock.sendMessage(from, { react: { text: "✅", key: ctx.m.key } });

    } catch (e) {
      console.error("Error en testwelcome:", e.message);
      await enviartexto(`❌ Error al probar la bienvenida: ${e.message}`);
    }
  }
};