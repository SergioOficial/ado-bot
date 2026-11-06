export default {
  command: ["waifu", "anime", "neko"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, comando } = ctx;
    await sock.sendMessage(from, { react: { text: "🌸", key: m.key } });

    try {
      const endpoint = comando === "neko" ? "neko" : "waifu";
      const res = await fetch(`https://api.waifu.pics/sfw/${endpoint}`);
      const data = await res.json();
      
      if (!data || !data.url) throw new Error("La API de anime no devolvió una URL.");

      const imgRes = await fetch(data.url);
      if (!imgRes.ok) throw new Error("Error al descargar la imagen de anime.");
      
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length === 0) throw new Error("La imagen de anime llegó vacía.");

      await sock.sendMessage(from, {
        image: buffer,
        caption: `🌸 *Anime aleatorio (SFW)*`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("Error en comando anime:", e.message);
      await enviartexto(`❌ Error al obtener la imagen: ${e.message}`);
    }
  }
};
