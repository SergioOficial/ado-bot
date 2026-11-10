import axios from "axios";

export default {
  command: ["invite", "addcolab", "colaborador"],
  isOwner: true, // Solo el dueño del bot puede invitar
  execute: async (ctx) => {
    const { enviartexto, args, config } = ctx;
    const username = args[0];
    // Permiso por defecto: 'push' (puede leer y escribir, pero no administrar)
    const permission = (args[1] || "push").toLowerCase();

    if (!username) {
      return enviartexto(
        `👥 *INVITAR COLABORADOR*\n\n` +
        `Uso: *${config.prefix[0]}invite <usuario_github> [permiso]*\n\n` +
        `Permisos disponibles:\n` +
        `➤ *pull* (solo lectura)\n` +
        `➤ *push* (leer y escribir, por defecto)\n` +
        `➤ *admin* (control total)\n\n` +
        `Ejemplo: *${config.prefix[0]}invite JefersonFernandez push*`
      );
    }

    // Validar el permiso
    if (!["pull", "push", "admin"].includes(permission)) {
      return enviartexto("⚠️ Permiso inválido. Usa *pull*, *push* o *admin*.");
    }

    // Obtener credenciales desde las variables de entorno o config
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || "levi-hub805";
    const GITHUB_REPO = process.env.GITHUB_REPO || "Levi-bot-";

    if (!GITHUB_TOKEN) {
      return enviartexto(
        "⚠️ *Falta el Token de GitHub.*\n" +
        "Configura la variable de entorno `GITHUB_TOKEN` en tu servidor con un token que tenga el scope `repo`."
      );
    }

    await ctx.sock.sendMessage(ctx.from, { react: { text: "📨", key: ctx.m.key } });

    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/collaborators/${username}`;
      
      await axios.put(url, { permission }, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Levi-Bot"
        }
      });

      await enviartexto(
        `✅ *Invitación enviada.*\n\n` +
        `👤 Usuario: *${username}*\n` +
        `🔑 Permiso: *${permission}*\n` +
        `📦 Repositorio: *${GITHUB_OWNER}/${GITHUB_REPO}*\n\n` +
        `_El usuario debe aceptar la invitación desde su correo o desde GitHub para unirse._`
      );

    } catch (error) {
      const status = error.response?.status;
      let mensajeError = "";

      if (status === 404) {
        mensajeError = "El usuario no existe en GitHub o el repositorio es incorrecto.";
      } else if (status === 403 || status === 401) {
        mensajeError = "El token no tiene permisos suficientes (necesita el scope `repo`).";
      } else if (status === 422) {
        mensajeError = "El usuario ya es colaborador o la invitación ya fue enviada.";
      } else {
        mensajeError = error.response?.data?.message || error.message;
      }

      await enviartexto(
        `❌ *No se pudo enviar la invitación.*\n\n` +
        `🔎 Detalle: _${mensajeError}_`
      );
    }
  }
};
