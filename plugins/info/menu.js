/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * plugins/info/menu.js — el menú, en un solo mensaje con imagen.
 *
 * QUÉ CAMBIÓ
 * ----------
 * Antes mandaba la imagen y, detrás, un segundo mensaje con la lista desplegable
 * de categorías («Selecciona una categoría»): dos mensajes por cada `.menu`, y el
 * segundo tapaba al primero. Ese desplegable ya no está. Ahora sale un mensaje
 * único, con la foto del bot y el menú completo, y las categorías se piden
 * escribiendo `.menu <categoría>`.
 *
 * Los comandos NO están escritos a mano aquí: se leen de los plugins que de
 * verdad están cargados (`pluginLoader`). Si un comando se añade, aparece solo; si
 * se borra, desaparece. Así el menú no vuelve a quedarse atrás.
 */
import { LEYENDA, CREDITO, marcar, catalogo, buscarCategoria, CATEGORIAS } from "../../lib/menu-ayuda.js";
import { descripcionDe } from "../../lib/descripciones.js";
import { canalDelBot, enlaceDelBot } from "../../lib/ajustes.js";
import { commands } from "../../pluginLoader.js";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

/** Nombres del propio menú: no se enseñan como si fueran comandos. */
const OCULTOS = new Set(["menu", "help", "menú", "ayuda", "allmenu", "comandos", "menucat", "categorias", "categorías"]);

/** Corte entre bloques. */
const HILO = "⋆｡ﾟ☁︎｡°࿐";

/** `» ˚୨•(=^●ω●^=)• ⊹ `Categoría` ⊹` */
const cabecera = (emoji, titulo) => `» ˚୨•(=^●ω●^=)• ⊹ ${emoji} \`${titulo}\` ⊹`;

/** Un comando con sus alias: `✧ `.work` `.w`` */
const enLinea = (p, c) =>
  `\`${p}${c.nombre}\`` + (c.alias.length ? " " + c.alias.slice(0, 8).map((a) => `\`${p}${a}\``).join(" ") : "");

export default {
  command: ["menu", "help", "menú", "ayuda"],
  execute: async (ctx) => {
    const { sock, sender, from, m, enviartexto, BOT_NAME, config, PREFIX, db, args } = ctx;
    const numero = sender.split("@")[0];
    const pedido = args.join(" ").trim();
    const p = PREFIX || ".";

    // ═══════════ DATOS DEL BOT ═══════════
    let version = "1.2.0";
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve("./package.json"), "utf8"));
      version = pkg.version || version;
    } catch {
      /* sin package.json se queda la versión de arriba */
    }

    const uptime = process.uptime();
    const dias = Math.floor(uptime / 86400);
    const horas = Math.floor((uptime % 86400) / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    let tiempoStr = "";
    if (dias > 0) tiempoStr += `${dias}d `;
    if (horas > 0) tiempoStr += `${horas}h `;
    tiempoStr += `${mins}m`;

    const plataforma = `${os.type()} ${os.release()} ${os.arch()}`;
    const totalUsers = Object.keys(db.users || {}).length.toLocaleString("en-US");

    const miJid = sock.user?.id || "";
    const miNumero = miJid.split("@")[0].split(":")[0];
    const esPrincipal = (config.owners || []).some((o) => (o.number || o) === miNumero);
    const botDb = db.users[`${miNumero}@s.whatsapp.net`] || {};
    const esPremium = botDb.premium === true;
    const tipoBot = esPrincipal ? "Owner" : esPremium ? "Prem-bot" : "Sub-Bot";

    const meses = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    const ahora = new Date();
    const fecha = `${ahora.getDate()} ${meses[ahora.getMonth()]} ${ahora.getFullYear()}, ${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")} ${ahora.getHours() >= 12 ? "PM" : "AM"}`;

    // El canal y el enlace se pueden cambiar con `.setchannel` y `.setlink`; si
    // no se ha tocado nada, se usan los de siempre.
    const canalPropio = canalDelBot(db);
    const CANAL_JID = canalPropio?.jid || "120363425322183138@newsletter";
    const CANAL_NOMBRE = canalPropio?.nombre || "⍪❖Ƭʜᴇ 𝑺𝒆𝒓𝒈𝒊𝒐—͟͟͞͞ꫂ •≏ 𝐎𝐟𝐢𝐜𝐢𝐚𝐥 𝐜𝐡𝐚𝐧𝐧𝐞𝐥⎚";
    const enlace = enlaceDelBot(db, config);
    const pfp = "https://i.postimg.cc/432DgtBQ/IMG-20261110-WA0107.jpg";

    let grupos = catalogo(commands, OCULTOS);

    // Si el mapa de plugins está vacío (el cargador aún no ha corrido, o alguien
    // llamó al menú desde una prueba), no se puede listar comandos. Antes de
    // mandar un error se enseña al menos el mapa de categorías, que es fijo.
    if (!grupos.length) {
      grupos = CATEGORIAS.map((c) => ({ ...c, comandos: [] }));
    }
    const totalComandos = grupos.reduce((n, g) => n + g.comandos.length, 0);
    const sinPlugins = totalComandos === 0;

    const cabeceraBot = `> *¡ʜᴏʟᴀ!* @${numero}, mucho gusto. Soy *${BOT_NAME || "Ado-Bot"}* (⁠ ⁠ꈍ⁠ᴗ⁠ꈍ⁠)\n` +
      `⌒࣪᷼⏜͡ ۪ ࿚ꨪᰰ࿙ ࣭࣪⢏࣭۟⢢࣭ׄ᎐፝֟᎐࣭ׄ⡔࣭۟⡹࣭ׄ ࿚ꨪᰰ࿙ ۪ ͡⏜ׄ᷼⌒\n\n` +
      `: ̗̀│ꕥ *ᴛɪᴘᴏ ::* ${tipoBot}\n` +
      `│❀ *ᴠᴇʀsɪóɴ ::* ${version}\n` +
      `│☄︎ *sɪsᴛᴇᴍᴀ ::* ${plataforma}\n` +
      `│❖ *ᴜsᴇʀs ::* ${totalUsers}\n` +
      `│❖ *ᴇɴᴄᴇɴᴅɪᴅᴏ ::* ${tiempoStr}\n` +
      `│❖ *ᴀʜᴏʀᴀ ::* ${fecha}\n` +
      `│❖ *ᴘʀᴇғɪᴊᴏ ::* ${p} · *ᴄᴏᴍᴀɴᴅᴏs ::* ${totalComandos}\n\n` +
      `⌒࣪᷼⏜͡ ۪ ࿚ꨪᰰ࿙ ࣭࣪⢏࣭۟⢢࣭ׄ᎐፝֟᎐࣭ׄ⡔࣭۟⡹࣭ׄ ࿚ꨪᰰ࿙ ۪ ͡⏜ׄ᷼⌒\n\n` +
      `⋆｡ﾟ🎄 ｡° *ᴄᴏᴍ꯭ᴀ꯭ɴ꯭ᴅ꯭ᴏ꯭s* ﾟ｡˚₊ 𓂃`;

    let texto;

    // ═══════════ UNA CATEGORÍA ═══════════
    const categoria = pedido && pedido !== "all" && pedido !== "todo" ? buscarCategoria(grupos, pedido) : null;

    if (categoria) {
      const lineas = [cabeceraBot, "", cabecera(categoria.emoji, categoria.titulo)];
      if (categoria.descripcion) lineas.push(`> ✐ ${categoria.descripcion}`);
      lineas.push("");
      for (const c of categoria.comandos) {
        const desc = descripcionDe(c.nombre) || descripcionDe(c.alias[0]);
        const marcas = Boolean(c.plugin.isOwner);
        lineas.push(`✧ ${enLinea(p, c)}${marcas ? " Ⓓ" : ""}`);
        if (desc) lineas.push(`> ${desc}`);
        lineas.push("");
      }
      lineas.push(`${HILO}\n> Volver: *${p}menu*\n> Otra: *${p}menu <categoría>*`);
      texto = lineas.join("\n");
    } else if (pedido && !(pedido === "all" || pedido === "todo")) {
      // No es una categoría: se le dan los nombres posibles, sin regañar.
      return enviartexto(
        `❌ No hay ninguna categoría *${pedido}*.\n\n` +
          grupos.map((g) => `│ ${g.emoji} *${g.titulo}* — \`${p}menu ${g.carpeta}\``).join("\n") +
          `\n\n> Ejemplo: *${p}menu admin*`
      );
    } else {
      // ═══════════ MENÚ PRINCIPAL ═══════════
      const lineas = [cabeceraBot, ""];
      for (const g of grupos) {
        lineas.push(cabecera(g.emoji, g.titulo));
        if (g.descripcion) lineas.push(`> ✐ ${g.descripcion}`);
        lineas.push(
          g.comandos.length
            ? `✧ ${g.comandos.map((c) => `\`${p}${c.nombre}\``).join(" ")}`
            : `> ✐ *${p}menu ${g.carpeta}*`
        );
        lineas.push("");
      }
      if (sinPlugins) {
        lineas.push("> ⚠️ Los plugins aún no están cargados: se ven las categorías, no los comandos.");
        lineas.push("");
      }
      lineas.push(`${HILO}`);
      lineas.push(`🔗 ${enlace}`);
      lineas.push("");
      lineas.push(LEYENDA);
      lineas.push("");
      lineas.push(CREDITO);
      texto = lineas.join("\n");
    }

    texto = marcar(texto.trim(), p, commands);

    try {
      await sock.sendMessage(
        from,
        {
          image: { url: pfp },
          caption: texto,
          mentions: [sender],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: CANAL_JID,
              newsletterName: CANAL_NOMBRE,
              serverMessageId: 1,
            },
          },
        },
        { quoted: m }
      );
    } catch (err) {
      console.error("⚠️ No se pudo enviar el menú con imagen:", err?.stack || err);
      await enviartexto(texto);
    }
  },
};
