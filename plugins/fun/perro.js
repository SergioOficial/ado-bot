export default {
  command: ["perro", "dog"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "🐶", key: m.key } });

    try {
      const res = await fetch("https://dog.ceo/api/breeds/image/random");
      const data = await res.json();
      
      if (!data || !data.message) throw new Error("La API de perros no devolvió una URL.");

      const imgRes = await fetch(data.message);
      if (!imgRes.ok) throw new Error("Error al descargar la imagen del perro.");
      
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length === 0) throw new Error("La imagen del perro llegó vacía.");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🐶 *¡Guau!*`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en comando perro:", e.message);
      await enviartexto(`❌ Error al obtener el perro: ${e.message}`);
    }
  }
};
