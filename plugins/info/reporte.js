export default {
  command: ["reporte", "report", "sugerencia", "sugerir"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, comando, sender, jidToNumber, BOT_NAME, config } = ctx;
    const textoReporte = args.join(" ").trim();
    if (!textoReporte) return enviartexto(`❌ Uso:\n• ${config.prefix}reporte <problema>\n• ${config.prefix}sugerencia <idea>`);

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) return enviartexto(`⚠️ El sistema de reportes no está disponible (Falta GITHUB_TOKEN).`);

    const GITHUB_OWNER = process.env.GITHUB_OWNER || "SergioOficial";
    const GITHUB_REPO = process.env.GITHUB_REPO || "reportes-bot";
    const usuario = m.pushName || "Anónimo";
    const numero = jidToNumber(sender);
    const fecha = new Date().toISOString().replace("T", " ").slice(0, 19);
    const tipo = comando === "sugerencia" || comando === "sugerir" ? "💡 Sugerencia" : "📩 Reporte";

    await sock.sendMessage(from, { react: { text: "📤", key: m.key } });
    const waitMsg = await sock.sendMessage(from, { text: `📤 Enviando reporte al sitio...` }, { quoted: m });

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "Levi-Bot" },
        body: JSON.stringify({ title: `${tipo} de ${usuario}`, body: `### ${tipo}\n\n${textoReporte}\n\n---\n**👤 Usuario:** ${usuario}\n**📱 Número:** +${numero}\n**📅 Fecha:** ${fecha}\n**🤖 Bot:** ${BOT_NAME}` })
      });

      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      const issue = await res.json();
      
      await sock.sendMessage(from, { text: issue.html_url, edit: waitMsg.key }).catch(async () => {
        await enviartexto(`✅ *Reporte enviado.*\n🔗 ${issue.html_url}`);
      });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ No se pudo enviar el reporte.\n_${err.message}_`, edit: waitMsg.key }).catch(() => {});
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    }
  }
};
