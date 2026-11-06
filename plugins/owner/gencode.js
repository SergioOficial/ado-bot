export default {
  command: ["gencode", "generarcodigo"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto, db, config } = ctx;
    
    if (!db.codes) db.codes = {};

    // Generar un código aleatorio tipo LEVI-XXXX
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "LEVI-";
    for (let i = 0; i < 4; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }

    // Guardarlo en la base de datos
    db.codes[codigo] = true;

    await enviartexto(`💎 *Código Premium Generado:*\n\n\`\`\`\n${codigo}\n\`\`\`\n\n_Envía este código al usuario para que lo canjee usando_ *${config.prefix}canjear ${codigo}*`);
  }
};
