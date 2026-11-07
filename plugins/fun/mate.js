export default {
  command: ["mate", "mates", "matematica"],
  execute: async (ctx) => {
    const { sender, enviartexto, db } = ctx;
    
    if (!db.users[sender]) db.users[sender] = {};

    const operadores = ["+", "-", "*"];
    const op = operadores[Math.floor(Math.random() * operadores.length)];
    let a, b, resultado, simbolo;

    if (op === "+") {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      resultado = a + b;
      simbolo = "➕";
    } else if (op === "-") {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * 20) + 1;
      resultado = a - b;
      simbolo = "➖";
    } else {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      resultado = a * b;
      simbolo = "✖️";
    }

    // Guardar respuesta
    db.users[sender].trivia = resultado.toString();

    const texto = `
┏━━━〔 🧮 𝐌𝐀𝐓𝐄𝐌𝐀́𝐓𝐈𝐂𝐀𝐒 〕━━━┓
┃ ${simbolo} *Resuelve:*
┃
┃      ${a} ${op} ${b} = ?
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
> Responde con *${ctx.config.prefix}responder <número>* o *${ctx.config.prefix}r <número>*
`.trim();

    await enviartexto(texto);
  }
};
