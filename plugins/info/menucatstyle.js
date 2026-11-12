/**
 * Ado Bot — AGPL-3.0-only. Ver NOTICE.
 * .menucatstyle — menú de categorías elegante.
 * Lista desplegable nativa (single_select) + botón de enlace al canal.
 * Solo usa botones estándar de WhatsApp (quick_reply, cta_url,
 * single_select) sin envoltorios viewOnce, con respaldo a texto.
 * Lee las categorías de las carpetas de plugins, no una lista fija.
 */
import { readdirSync } from "fs";
import { join } from "path";
import { enviarConBotones, rapido, lista, enlace } from "../../lib/botones.js";

const TITULOS = {
  admin: "🛡️ ADMIN",
  descargas: "🎄 DESCARGAS",
  economia: "💰 ECONOMÍA",
  fun: "🎉 DIVERSIÓN",
  ia: "🧠 IA",
  info: "ℹ️ INFO",
  owner: "👑 OWNER",
  perfil: "🧾 PERFIL",
  premium: "💎 PREMIUM",
  rpg: "⚔️ RPG",
  stickers: "🖌️ STICKERS",
  subbots: "🤖 SUB-BOTS",
  test: "🧪 TEST",
  utils: "🔔 UTILIDADES",
};

const CANAL_URL = "https://whatsapp.com/channel/0029Vb758GP6rsQkqWy5Xm2j";

function porCategoria() {
  const raiz = join(process.cwd(), "plugins");
  const salida = {};
  for (const carpeta of readdirSync(raiz)) {
    let archivos;
    try {
      archivos = readdirSync(join(raiz, carpeta)).filter((f) => f.endsWith(".js"));
    } catch {
      continue;
    }
    salida[carpeta] = archivos.map((f) => f.replace(/\.js$/, "")).sort();
  }
  return salida;
}

export default {
  command: ["menucatstyle", "mcs"],
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, PREFIX, config } = ctx;
    const sub = (args?.[0] || "").toLowerCase().trim();
    const categorias = porCategoria();
    const nombres = Object.keys(categorias).sort();
    const total = Object.values(categorias).reduce((n, l) => n + l.length, 0);
    const numero = sender.split("@")[0];

    // .menucatstyle <categoría> → detalle
    if (sub) {
      const cat = nombres.find((c) => c === sub || sub.startsWith(c) || c.startsWith(sub));
      if (!cat) {
        return enviartexto(`❌ Categoría *${sub}* no encontrada.\n\n📂 *Disponibles:*\n${nombres.map((c) => `• \`${PREFIX}menucatstyle ${c}\``).join("\n")}`);
      }
      const titulo = TITULOS[cat] || cat.toUpperCase();
      const texto =
        `╭──〔 ${titulo} 〕──⬣\n` +
        categorias[cat].map((n) => `│ >${PREFIX}${n}`).join("\n") + "\n" +
        `╰──────────────⬣\n\n` +
        `◈ *Total:* ${categorias[cat].length} comandos en esta categoría\n\n` +
        `_Usa los botones para navegar._`;
      await enviarConBotones(sock, from, {
        titulo: `✦ ${titulo}`,
        texto,
        pie: config.footer,
        botones: [
          rapido("Volver a categorías", "menucatstyle"),
          enlace("Visitar", CANAL_URL),
          rapido("Menú principal", "menu"),
        ],
        cita: m,
      }).catch(() => enviartexto(texto));
      return;
    }

    // .menucatstyle → selector de categorías
    const rows = nombres.map((c) => ({
      id: `menucatstyle ${c}`,
      title: TITULOS[c] || c.toUpperCase(),
      description: `${categorias[c].length} comandos`,
    }));
    const texto =
      `✦ Hola, *@${numero}*\n\n` +
      `╭──〔 *CATEGORÍAS* 〕──⬣\n` +
      `│ Selecciona una categoría en la\n` +
      `│ lista desplegable para ver sus\n` +
      `│ comandos disponibles.\n` +
      `╰──────────────⬣\n\n` +
      `◈ *Total:* ${total} comandos`;

    await enviarConBotones(sock, from, {
      titulo: "✦ Categorías",
      texto,
      pie: config.footer,
      botones: [
        lista("Selecciona una categoría", [{ title: "Categorías", rows }]),
        enlace("Visitar", CANAL_URL),
        rapido("Ver todo", "allmenu"),
        rapido("Menú", "menu"),
      ],
      cita: m,
    }).catch(() => enviartexto(texto));
  },
};
