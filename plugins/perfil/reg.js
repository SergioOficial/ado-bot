export default {
  command: ["reg", "register", "registrar"],
  execute: async (ctx) => {
    const { sock, sender, from, m, args, enviartexto, db, config } = ctx;

    const [nombre, edad, genero] = args;
    if (!nombre || !edad || !genero) {
      return enviartexto(`⚠️ *Uso correcto:*\n${config.prefix}reg <nombre> <edad> <M/F>\n\n*Ejemplo:* ${config.prefix}reg Levi 20 M`);
    }

    // Verificar si ya está registrado
    if (!db.users[sender]) db.users[sender] = {};
    if (db.users[sender].nombre) {
      return enviartexto("⚠️ Ya estás registrado en el sistema.");
    }

    // Guardar datos en la base de datos
    const fecha = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
    const numero = sender.split("@")[0];

    db.users[sender] = {
      ...db.users[sender],
      id: sender,
      numero,
      nombre,
      edad,
      genero: genero.toUpperCase(),
      fecha,
      nivel: 1,
      exp: 0,
      coins: 0,
      oro: 0
    };

    const textoReg = `
┏━━━〔 🐾 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐎 〕━━━┓
┃ ✦ *¡Bienvenido!* @${numero}
┃
┃ ➤ *Nombre:* ${nombre}
┃ ➤ *Edad:* ${edad}
┃ ➤ *Género:* ${genero.toUpperCase()}
┃ ➤ *Fecha:* ${fecha}
┃ ➤ *Estado:* Registrado ✅
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
> Usa ${config.prefix}perfil para ver tu tarjeta.
${config.footer}
`.trim();

    await sock.sendMessage(from, { text: textoReg, mentions: [sender] }, { quoted: m });
  }
};
