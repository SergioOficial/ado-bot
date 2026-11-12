import axios from "axios";

export default {
  command: ["gitsearch", "githubsearch", "ghsearch"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ").trim();

    if (!query) {
      return enviartexto(`🐙 *GITHUB SEARCH*\n\nUso: ${config.prefix[0]}gitsearch <término>\nEjemplo: ${config.prefix[0]}gitsearch whatsapp bot baileys`);
    }

    await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `🔍 *Buscando repositorios de:* "${query}"...` }, { quoted: m });

    try {
      const apiKey = process.env.NATSU_API_KEY || "";
      const apiUrl = `https://natsu-api.darkcore.xyz/api/githubsearch?q=${encodeURIComponent(query)}&apikey=${apiKey}`;
      
      const res = await axios.get(apiUrl, { timeout: 20000 });
      const data = res.data;

      // 🕵️‍♂️ Extracción robusta por si la API devuelve diferentes estructuras
      let items = data.data?.items || data.result?.items || data.data || data.result || data.results || [];
      
      if (!Array.isArray(items)) {
        if (items.items && Array.isArray(items.items)) items = items.items;
        else if (items.repos && Array.isArray(items.repos)) items = items.repos;
        else items = [];
      }

      if (items.length === 0) {
        throw new Error("No se encontraron repositorios para tu búsqueda.");
      }

      let txt = `🐙 *RESULTADOS DE GITHUB:* "${query}"\n\n`;
      
      const topItems = items.slice(0, 5);
      
      topItems.forEach((repo, i) => {
        const name = repo.full_name || repo.name || repo.repo_name || "Desconocido";
        const url = repo.html_url || repo.url || `https://github.com/${name}`;
        const stars = repo.stargazers_count !== undefined ? repo.stargazers_count : (repo.stars || 0);
        const desc = repo.description || "Sin descripción";
        const lang = repo.language ? `| 📝 ${repo.language}` : "";

        txt += `*${i + 1}.* [${name}](${url})\n`;
        txt += `   ⭐ ${stars.toLocaleString()} ${lang}\n`;
        txt += `   📖 ${desc.slice(0, 80)}${desc.length > 80 ? '...' : ''}\n\n`;
      });

      await sock.sendMessage(from, { text: txt.trim(), edit: waitMsg.key }).catch(() => {
         enviartexto(txt.trim());
      });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error en GitHub Search:", e.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      
      await sock.sendMessage(from, { 
        text: `❌ *Error al buscar en GitHub.*\n🔎 Detalle: _${e.message}_`, 
        edit: waitMsg.key 
      }).catch(() => {
        enviartexto(`❌ Error: ${e.message}`);
      });
    }
  }
};