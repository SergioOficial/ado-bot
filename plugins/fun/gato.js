export default {
  command: ["gato", "cat", "meow"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;
    await sock.sendMessage(from, { react: { text: "🐱", key: m.key } });

    try {
      // Obtener URL del gato
      const res = await fetch("https://api.thecatapi.com/v1/images/search");
      const data = await res.json();
      const imgUrl = data[0].url;

      // Descargar con fetch
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error("Error al descargar la imagen del gato.");
      
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length === 0) throw new Error("La imagen del gato llegó vacía.");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🐱 *¡Miau!*`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en comando gato:", e.message);
      await enviartexto(`❌ Error al obtener el gato: ${e.message}`);
    }
  }
};
