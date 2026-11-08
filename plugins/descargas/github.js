import axios from "axios";

// Token opcional para aumentar el límite de peticiones
const GH_TOKEN = process.env.GITHUB_TOKEN || null;
const GH_HEADERS = GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {};

export default {
  command: ["gitclone", "gitsearch", "gituser", "github"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config, comando } = ctx;
    
    // 📖 AYUDA
    if (comando === "github") {
      return enviartexto(
        `🐙 *COMANDOS DE GITHUB*\n\n` +
        `➤ ${config.prefix}gitsearch <término> → Buscar repositorios\n` +
        `➤ ${config.prefix}gituser <usuario> → Info de un usuario\n` +
        `➤ ${config.prefix}gitclone <usuario/repo> → Descargar repo en ZIP\n\n` +
        `_Ejemplo: ${config.prefix}gitclone WhiskeySockets/Baileys_`
      );
    }

    // 🔍 1. BUSCAR REPOSITORIOS (.gitsearch)
    if (comando === "gitsearch") {
      const query = args.join(" ");
      if (!query) return enviartexto(`🔍 Uso: ${config.prefix}gitsearch <término de búsqueda>`);

      await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
      try {
        const res = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`, { headers: GH_HEADERS });
        const repos = res.data.items;

        if (!repos || repos.length === 0) throw new Error("No se encontraron repositorios.");

        let texto = `🔍 *RESULTADOS DE BÚSQUEDA:* "${query}"\n\n`;
        repos.forEach((repo, i) => {
          texto += `*${i + 1}.* [${repo.full_name}](${repo.html_url})\n`;
          texto += `   ⭐ ${repo.stargazers_count.toLocaleString()} | 🍴 ${repo.forks_count}\n`;
          texto += `   📝 ${repo.description ? repo.description.slice(0, 80) + "..." : "Sin descripción"}\n\n`;
        });

        await enviartexto(texto.trim());
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      } catch (e) {
        await enviartexto(`❌ Error en la búsqueda: ${e.message}`);
      }
    }

    // 👤 2. INFO DE USUARIO (.gituser)
    else if (comando === "gituser") {
      const username = args[0];
      if (!username) return enviartexto(`👤 Uso: ${config.prefix}gituser <nombre_de_usuario>`);

      await sock.sendMessage(from, { react: { text: "👤", key: m.key } });
      try {
        const res = await axios.get(`https://api.github.com/users/${username}`, { headers: GH_HEADERS });
        const user = res.data;

        if (user.message === "Not Found") throw new Error("Usuario no encontrado.");

        const texto = `
🐙 *PERFIL DE GITHUB*
┏━━━━━━━━━━━━━━━━━━┓
┃ 👤 *Nombre:* ${user.name || user.login}
┃ 🆔 *Usuario:* @${user.login}
┃ 📝 *Bio:* ${user.bio || "Sin biografía"}
┃ 🏢 *Empresa:* ${user.company || "N/A"}
┃ 📍 *Ubicación:* ${user.location || "N/A"}
┃ 👥 *Seguidores:* ${user.followers.toLocaleString()}
┃ 📦 *Repositorios:* ${user.public_repos}
┃ 🔗 *URL:* ${user.html_url}
┗━━━━━━━━━━━━━━━━━━┛
`.trim();

        // Enviar con foto de perfil si existe
        if (user.avatar_url) {
          const imgRes = await axios.get(user.avatar_url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(imgRes.data, 'binary');
          await sock.sendMessage(from, { image: buffer, caption: texto }, { quoted: m });
        } else {
          await enviartexto(texto);
        }
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
      } catch (e) {
        await enviartexto(`❌ Error: ${e.message}`);
      }
    }

    // 📦 3. DESCARGAR REPOSITORIO (.gitclone)
    else if (comando === "gitclone") {
      const repoPath = args[0];
      if (!repoPath || !repoPath.includes("/")) {
        return enviartexto(`📦 Uso: ${config.prefix}gitclone <usuario/repositorio>\nEjemplo: ${config.prefix}gitclone WhiskeySockets/Baileys`);
      }

      const [owner, repo] = repoPath.split("/");
      await sock.sendMessage(from, { react: { text: "📦", key: m.key } });
      const waitMsg = await enviartexto(`📦 *Descargando repositorio...*\n_${owner}/${repo}_`);

      try {
        // Pedir el archivo ZIP a la API de GitHub (esto devuelve una redirección)
        const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/zipball`, {
          headers: GH_HEADERS,
          responseType: 'arraybuffer',
          maxRedirects: 5 // Seguir la redirección para obtener el archivo real
        });

        const buffer = Buffer.from(res.data, 'binary');

        // Enviar como documento
        await sock.sendMessage(from, {
          document: buffer,
          fileName: `${repo}.zip`,
          mimetype: "application/zip",
          caption: `✅ *Repositorio descargado:*\n> ${owner}/${repo}\n\n_Nota: El ZIP incluye la carpeta raíz con el nombre del repo._`
        }, { quoted: m });

        await sock.sendMessage(from, { delete: waitMsg.key }).catch(() => {});
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

      } catch (e) {
        console.error("Error en gitclone:", e.message);
        const errorMsg = e.response?.status === 404 ? "Repositorio no encontrado o es privado." : e.message;
        await enviartexto(`❌ Error al descargar: ${errorMsg}`);
        await sock.sendMessage(from, { delete: waitMsg.key }).catch(() => {});
      }
    }
  }
};
