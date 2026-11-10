/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * .botinfo                ficha técnica del bot (versión, cliente, prefijos)
 * .blocklist              quién está bloqueado
 * .block / .unblock <n>   bloquear y desbloquear, comprobado contra la lista real
 * .getplugin <x>          el código de un plugin, para leerlo desde el móvil
 *
 * Son las que el JS no podía hacer bien: leer archivos del propio proyecto y
 * tocar la lista de bloqueados de WhatsApp. Todas son de dueño.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { paquete } from "../../lib/baileys.js";
import { numeroDe } from "../../lib/grupo.js";

const RUTA_PLUGINS = join(process.cwd(), "plugins");

export default {
  command: ["botinfo", "blocklist", "bloqueados", "block", "bloquear", "unblock", "desbloquear", "getplugin"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, comando, args, sender, enviartexto, PREFIX, config, BOT_NAME } = ctx;

    // ── .botinfo ──────────────────────────────────────────────────────────
    if (comando === "botinfo") {
      return enviartexto(
        `🤖 *${BOT_NAME}*\n\n` +
          `│ Versión › *${config.version}*\n` +
          `│ Cliente › \`${paquete}\`\n` +
          `│ Prefijos › ${config.prefix.join(" ")}\n` +
          `│ Dueños › *${(config.owners || []).length}* (${(config.owners || []).map(numeroDe).join(", ")})\n` +
          `│ Tu número › *${numeroDe(sender)}*\n` +
          `│ Node › ${process.version}\n` +
          `╰─\n\n> ${config.footer}`
      );
    }

    // ── .blocklist ────────────────────────────────────────────────────────
    if (comando === "blocklist" || comando === "bloqueados") {
      try {
        const lista = (await sock.fetchBlocklist()) || [];
        if (!lista.length) return enviartexto("✅ *Nadie bloqueado* desde esta cuenta.");
        return enviartexto(
          `🚫 *Bloqueados* (${lista.length})\n\n` +
            lista.map((j, i) => `${i + 1}. \`${numeroDe(j)}\``).join("\n") +
            `\n\n> Para desbloquear: *${PREFIX}unblock <número>*`
        );
      } catch (err) {
        return enviartexto(`⚠️ No pude leer la lista: ${err.message}`);
      }
    }

    // ── .block / .unblock ─────────────────────────────────────────────────
    if (["block", "bloquear", "unblock", "desbloquear"].includes(comando)) {
      const bloquear = comando === "block" || comando === "bloquear";
      const crudo = String(args[0] || "").replace(/\D/g, "");

      if (crudo.length < 7 || crudo.length > 15) {
        return enviartexto(
          `《✧》 Uso: *${PREFIX}${comando} <número>*\n> Con lada y sin signos: ${PREFIX}${comando} 5215512345678`
        );
      }

      const jid = `${crudo}@s.whatsapp.net`;
      try {
        await sock.updateBlockStatus(jid, bloquear ? "block" : "unblock");

        // Se comprueba contra la lista de verdad: si no aparece, no se dice «hecho».
        const lista = (await sock.fetchBlocklist()) || [];
        const esta = lista.some((j) => numeroDe(j) === crudo);
        if (bloquear !== esta) {
          return enviartexto(`⚠️ Pedí ${bloquear ? "bloquear" : "desbloquear"} *${crudo}* pero WhatsApp no lo aplicó.`);
        }
        return enviartexto(
          `${bloquear ? "🚫 Bloqueado" : "✅ Desbloqueado"} *${crudo}*.\n> En la lista hay *${lista.length}* número(s).`
        );
      } catch (err) {
        return enviartexto(`⚠️ No pude: ${err.message}`);
      }
    }

    // ── .getplugin ────────────────────────────────────────────────────────
    // Solo nombres simples: aquí se lee un archivo del disco y nadie debe poder
    // pedir «../../etc/passwd».
    const nombre = String(args[0] || "").replace(/\.js$/, "");
    if (!/^[a-z0-9_-]{1,40}$/i.test(nombre)) {
      return enviartexto(`《✧》 Uso: *${PREFIX}getplugin <nombre>* (sin rutas ni barras)`);
    }

    for (const carpeta of readdirSync(RUTA_PLUGINS)) {
      const ruta = join(RUTA_PLUGINS, carpeta, `${nombre}.js`);
      let codigo;
      try {
        codigo = readFileSync(ruta, "utf8");
      } catch {
        continue; // no está en esta carpeta
      }
      if (codigo.length > 25_000) {
        return enviartexto(
          `📄 *${carpeta}/${nombre}.js*\n> Pesa ${(codigo.length / 1024).toFixed(1)} KB: demasiado para un mensaje.`
        );
      }
      return enviartexto(`📄 *${carpeta}/${nombre}.js*\n\n\`\`\`${codigo}\`\`\``);
    }
    return enviartexto(`❌ No existe el plugin *${nombre}*.`);
  },
};
