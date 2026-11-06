export default {
  command: ["ping", "p"],
  execute: async (ctx) => {
    const { sock, from, m } = ctx;
    const start = Date.now();
    const sent = await sock.sendMessage(from, { text: "🏓 Calculando..." }, { quoted: m });
    const latency = Date.now() - start;
    await sock.sendMessage(from, { text: ` *✰ ¡Pong!* \n> *Tiempo ⴵ*  ${latency} ms`, edit: sent.key });
  }
};
