export default {
  command: ["setdesc", "setdescripcion"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    const user = db.users[sender];
    const isPremium = user?.premium === true || (user?.premiumExpiresAt && user.premiumExpiresAt > Date.now());

    if (!isPremium) return enviartexto(`💎 Esta función es exclusiva para *Premium*.\nUsa *${config.prefix[0]}prem* para más info.`);
    
    const desc = args.join(" ");
    if (!desc) return enviartexto("📝 Escribe una descripción.");
    
    user.desc = desc.slice(0, 150); // Máximo 150 letras
    await enviartexto(`✅ Descripción actualizada:\n_${user.desc}_`);
  }
};