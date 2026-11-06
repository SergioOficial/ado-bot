import axios from "axios";

export default {
  command: ["clima", "weather"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    const ciudad = args.join(" ").trim();
    if (!ciudad) return enviartexto(`⛅ Uso: ${config.prefix}clima <ciudad>`);

    await sock.sendMessage(from, { react: { text: "⛅", key: m.key } });

    try {
      const res = await axios.get(`https://wttr.in/${encodeURIComponent(ciudad)}?format=j1`);
      const data = res.data.current_condition[0];
      
      const temp = data.temp_C;
      const desc = data.lang_es ? data.lang_es[0].value : data.weatherDesc[0].value;
      const humedad = data.humidity;
      const viento = data.windspeedKmph;

      const text = `⛅ *Clima en ${ciudad}*\n\n` +
                   `🌡️ *Temperatura:* ${temp}°C\n` +
                   `☁️ *Estado:* ${desc}\n` +
                   `💧 *Humedad:* ${humedad}%\n` +
                   `💨 *Viento:* ${viento} km/h`;

      await enviartexto(text);
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await enviartexto("❌ No se pudo obtener el clima. Verifica el nombre de la ciudad.");
    }
  }
};
