import axios from "axios";

export default {
  command: ["perro", "dog"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "🐶", key: m.key } });

    try {
      const res = await axios.get("https://dog.ceo/api/breeds/image/random", { timeout: 10000 });
      const imgUrl = res.data.message;

      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(imgRes.data);
      
      if (buffer.length === 0) throw new Error("La imagen llegó vacía.");

      await sock.sendMessage(from, { image: buffer, caption: `🐶 *¡Guau!*` }, { quoted: m });
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en perro:", e.message);
      await enviartexto(`❌ Error al obtener el perro: ${e.message}`);
    }
  }
};
