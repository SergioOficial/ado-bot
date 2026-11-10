export default {
  command: ["nivel", "lvl", "exp", "level"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;

    if (!db.users[sender] || !db.users[sender].nombre) {
      return enviartexto(`❌ Aún no estás registrado.\nUsa: *${config.prefix[0]}reg <nombre> <edad> <M/F>*`);
    }

    const user = db.users[sender];
    const nivel = user.nivel || 1;
    const exp = user.exp || 0;
    const expNecesaria = nivel * 100;
    
    // Cálculo de la barra de progreso
    const progreso = Math.min(10, Math.floor((exp / expNecesaria) * 10));
    const barra = "▰".repeat(progreso) + "▱".repeat(10 - progreso);

    const texto = `
┏━━━〔 🏅 𝐍𝐈𝐕𝐄𝐋 〕━━━┓
┃ 👤 *Usuario:* @${sender.split("@")[0]}
┃
┃ ✦ *Nivel actual:* ${nivel}
┃ ✦ *Experiencia:* ${exp} / ${expNecesaria} XP
┃ ✦ *Progreso:* [${barra}]
┃
┃ ➤ *Faltan:* ${expNecesaria - exp} XP
┃ ➤ *Para subir al nivel ${nivel + 1}*
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
> Gana EXP usando ${config.prefix[0]}cazar, ${config.prefix[0]}pescar, etc.
${config.footer}
`.trim();

    await ctx.sock.sendMessage(ctx.from, { text: texto, mentions: [sender] }, { quoted: ctx.m });
  }
};