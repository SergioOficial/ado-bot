export default {
  command: ["setfecha", "setcumple"],
  execute: async (ctx) => {
    const { sender, args, enviartexto, db, config } = ctx;
    const user = db.users[sender];
    const isPremium = user?.premium === true || (user?.premiumExpiresAt && user.premiumExpiresAt > Date.now());

    if (!isPremium) return enviartexto(`💎 Esta función es exclusiva para *Premium*.\nUsa *${config.prefix[0]}prem* para más info.`);
    
    const fecha = args.join(" ");
    if (!fecha) return enviartexto("📅 Escribe una fecha (ej: 24 de Diciembre).");
    
    user.customFecha = fecha.slice(0, 30);
    await enviartexto(`✅ Fecha personalizada actualizada:\n_${user.customFecha}_`);
  }
};