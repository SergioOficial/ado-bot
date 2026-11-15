export default {
  command: ["prem", "premium", "vip"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, config } = ctx;

    const precio = 500000; // 500k de coins por 30 días (puedes cambiarlo)
    const duracionDias = 30;
    
    // 📩 Si el usuario quiere comprar con coins
    if (args[0]?.toLowerCase() === "buy" || args[0]?.toLowerCase() === "comprar") {
      if (!db.users[sender]) db.users[sender] = {};
      const user = db.users[sender];

      if (user.premium || (user.premiumExpiresAt && user.premiumExpiresAt > Date.now())) {
        return enviartexto("💎 Ya eres Premium, no necesitas comprar más.");
      }

      if ((user.coins || 0) < precio) {
        return enviartexto(`❌ No tienes suficientes coins.\n> Necesitas: *¥${precio.toLocaleString()}*\n> Tienes: *¥${(user.coins || 0).toLocaleString()}*`);
      }

      // Descontar coins y dar premium
      user.coins -= precio;
      user.premiumExpiresAt = Date.now() + (duracionDias * 24 * 60 * 60 * 1000);
      
      return enviartexto(`💎 *¡Felicidades!* Has comprado *${duracionDias} días* de Premium.\n> Coins restantes: *¥${user.coins.toLocaleString()}*\n> Disfruta de los beneficios exclusivos.`);
    }

    // 📩 Mensaje informativo por defecto
    const mensaje = `
╭─「 💎 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 」─╮

✨ *Beneficios de ser Premium:*
> 🚀 *Economía:* Cooldowns reducidos a la mitad.
> 🎰 *Gacha:* Mejor suerte en tiradas y reclamos rápidos.
> 🤖 *IA:* Acceso a respuestas más avanzadas.
> 🎭 *Roles:* Acceso a roles fuera del círculo familiar.
> 🎨 *Perfil:* Personalización total (descripción, fecha, etc.).
> 🎁 *Menú exclusivo:* Comandos en Beta antes que nadie.

💳 *Precio:* ¥${precio.toLocaleString()} coins por *${duracionDias} días*.
Para comprar, escribe:
> *${config.prefix[0]}prem buy*

📞 *O paga con dinero real contactando a los Devs:*
> 👑 Sergio: +53 580 906 50
> 👑 Jeferson: +57 300 525 5807

> _Los usuarios Premium antiguos conservan su rango para siempre._
╰─────────────────────╯
${config.footer}
    `.trim();

    await enviartexto(mensaje);
  }
};