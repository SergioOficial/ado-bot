export default {
  command: ["responder", "r", "ans"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    const user = db.users[sender];

    if (!user || !user.trivia) {
      return enviartexto("⚠️ No tienes ninguna trivia activa. Usa *" + config.prefix + "trivia* para empezar.");
    }

    const respuesta = args[0]?.toUpperCase();
    if (!respuesta) return enviartexto("⚠️ Escribe tu respuesta. Ejemplo: *" + config.prefix + "r A*");

    const correcta = user.trivia;
    delete user.trivia; // Borrar la trivia para que no se repita

    if (respuesta === correcta) {
      const recompensa = Math.floor(Math.random() * 200) + 100; // 100 - 300 coins
      user.coins = (user.coins || 0) + recompensa;
      await enviartexto(`
┏━━━〔 ✅ 𝐂𝐎𝐑𝐑𝐄𝐂𝐓𝐎 〕━━━┓
┃ 🎉 ¡Has acertado!
┃ 💰 *Recompensa:* +${recompensa} Coins
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
${config.footer}
`.trim());
    } else {
      await enviartexto(`
┏━━━〔 ❌ 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓𝐎 〕━━━┓
┃ 💀 La respuesta correcta era la *${correcta}*.
┃ ¡Suerte para la próxima!
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
${config.footer}
`.trim());
    }
  }
};
