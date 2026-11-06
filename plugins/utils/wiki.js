import axios from "axios";

export default {
  command: ["wiki", "wikipedia"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const query = args.join(" ");
    if (!query) return enviartexto(`❌ Uso: ${config.prefix}wiki <búsqueda>`);

    await sock.sendMessage(from, { react: { text: "📚", key: m.key } });

    try {
      const res = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      const data = res.data;

      if (!data.extract) throw new Error("No se encontró información.");

      const text = `📚 *${data.title}*\n\n${data.extract}`;
      const imgUrl = data.thumbnail?.source;

      if (imgUrl) {
        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imgRes.data, 'binary');
        await sock.sendMessage(from, { image: buffer, caption: text }, { quoted: m });
      } else {
        await sock.sendMessage(from, { text }, { quoted: m });
      }

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await enviartexto(`❌ No se encontró información sobre *${query}*.`);
    }
  }
};
