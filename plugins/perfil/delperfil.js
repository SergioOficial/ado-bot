export default {
  command: ["delperfil", "eliminarperfil", "unreg"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, db } = ctx;

    if (!db.users[sender]) {
      return enviartexto("❌ No estás registrado en la base de datos.");
    }

    // Borrar todos los datos del usuario
    delete db.users[sender];

    await sock.sendMessage(from, {
      text: `🗑️ @${sender.split("@")[0]}, tu perfil y todos tus datos (nivel, coins, etc.) han sido eliminados correctamente.`,
      mentions: [sender]
    }, { quoted: m });
  }
};
