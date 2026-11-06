import axios from "axios";

export default {
  command: ["gato", "cat", "meow"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    
    await sock.sendMessage(from, { react: { text: "🐱", key: m.key } });

    try {
      const res = await axios.get("https://api.thecatapi.com/v1/images/search");
      const imgUrl = res.data[0].url;

      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imgRes.data, 'binary');

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🐱 *¡Miau!*`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await enviartexto("❌ No se pudo obtener la foto del gato.");
    }
  }
};
