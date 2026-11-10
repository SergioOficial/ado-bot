/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * .nuevo <nombre> [carpeta]   (dueño) crea un plugin que ya funciona
 * .delplugin <nombre>         (dueño) lo borra, con confirmación de 2 minutos
 *
 * El archivo que se escribe **carga y responde de verdad**: cabecera de
 * licencia, formato de Levi (`command`/`execute`) y un mensaje de prueba que
 * dice con qué argumentos lo llamaron. Así no queda un archivo vacío que haya
 * que arreglar después.
 */
import { writeFileSync, existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";

const RUTA_PLUGINS = join(process.cwd(), "plugins");

const CARPETAS = [
  "admin", "descargas", "economia", "fun", "ia", "info", "owner",
  "perfil", "premium", "rpg", "stickers", "subbots", "test", "utils",
];

function ubicar(nombre) {
  for (const carpeta of readdirSync(RUTA_PLUGINS)) {
    const ruta = join(RUTA_PLUGINS, carpeta, `${nombre}.js`);
    if (existsSync(ruta)) return { carpeta, ruta };
  }
  return null;
}

export default {
  command: ["nuevo", "newplugin", "delplugin", "borrarplugin"],
  isOwner: true,
  execute: async (ctx) => {
    const { args, comando, enviartexto, PREFIX, db, from } = ctx;
    const crear = comando === "nuevo" || comando === "newplugin";
    const nombre = String(args[0] || "").toLowerCase().replace(/\.js$/, "");

    if (!/^[a-z0-9_-]{2,32}$/.test(nombre)) {
      return enviartexto(`《✧》 Uso: *${PREFIX}${comando} <nombre>*\n> Solo letras, números, guion y guion bajo (2–32).`);
    }

    const existente = ubicar(nombre);
    if (crear && existente) {
      return enviartexto(
        `⚠️ Ya existe *${existente.carpeta}/${nombre}.js*.\n> Léelo con *${PREFIX}getplugin ${nombre}*.`
      );
    }

    // ── crear ─────────────────────────────────────────────────────────────
    if (crear) {
      const carpeta = CARPETAS.includes(String(args[1] || "")) ? String(args[1]) : "utils";
      const ruta = join(RUTA_PLUGINS, carpeta, `${nombre}.js`);

      const codigo = `/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * .${nombre} — (escribe aquí qué hace, en una línea)
 */
export default {
  command: ["${nombre}"],
  execute: async (ctx) => {
    const { args, enviartexto, PREFIX, sender } = ctx;

    return enviartexto(
      \`🛠️ *${nombre}* todavía no hace nada.\\n\\n\` +
        \`> Lo creó el dueño desde WhatsApp.\\n\` +
        \`> Edita *plugins/${carpeta}/${nombre}.js* para darle vida.\\n\` +
        \`> Recibí \${args.length} argumento(s) de \${sender.split("@")[0]}.\\n\` +
        \`> Prefijo: \${PREFIX}\`
    );
  },
};
`;
      writeFileSync(ruta, codigo, "utf8");
      return enviartexto(
        `✅ *Plugin creado*\n\n> Archivo: \`plugins/${carpeta}/${nombre}.js\`\n` +
          `> Comando: *${PREFIX}${nombre}*\n> Ya responde; al editarlo, reinicia el bot para verlo.`
      );
    }

    // ── borrar, con confirmación ──────────────────────────────────────────
    if (!existente) return enviartexto(`❌ No existe el plugin *${nombre}*.`);

    const clave = `confirmarBorrar_${nombre}`;
    db.chats ||= {};
    db.chats[from] ||= {};

    const pedido = Number(db.chats[from][clave]) || 0;
    if (!pedido || Date.now() - pedido > 2 * 60_000) {
      db.chats[from][clave] = Date.now();
      db.saveDatabase?.();
      return enviartexto(
        `⚠️ ¿Borrar *${existente.carpeta}/${nombre}.js*?\n\n` +
          `> Escribe otra vez *${PREFIX}${comando} ${nombre}* en los próximos 2 minutos para confirmar.\n` +
          `> Si no, no se toca nada.`
      );
    }

    unlinkSync(existente.ruta);
    delete db.chats[from][clave];
    db.saveDatabase?.();
    return enviartexto(
      `🗑️ Borrado \`${existente.carpeta}/${nombre}.js\`.\n> Reinicia el bot para que desaparezca del menú.`
    );
  },
};
