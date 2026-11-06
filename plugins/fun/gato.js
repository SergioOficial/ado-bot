import axios from "axios";

export default {
  command: ["gato", "cat", "meow"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "🐱", key: m.key } });

    try {
      const res = await axios.get("https://api.thecatapi.com/v1/images/search", { timeout: 10000 });
      const imgUrl = res.data[0].url;

      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(imgRes.data);
      
      if (buffer.length === 0) throw new Error("La imagen llegó vacía.");

      await sock.sendMessage(from, { image: buffer, caption: `🐱 *¡Miau!*` }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en gato:", e.message);
      await enviartexto(`❌ Error al obtener el gato: ${e.message}`);
    }
  }
};
