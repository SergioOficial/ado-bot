/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * .fix   (dueño) actualiza el código desde GitHub conservando la base de datos
 *
 * Lo que se corrigió: el original hacía `git reset --hard origin/main` a secas.
 * Si el bot tenía cambios propios sin subir —o archivos nuevos— se los llevaba
 * por delante sin decir nada (a nosotros nos borró trabajo dos veces). Ahora:
 *
 *   1. mira si el árbol tiene cambios;
 *   2. si los tiene, guarda un parche en `tmp/parche-<fecha>.patch` y **no
 *      toca nada** hasta que el dueño repita el comando;
 *   3. solo entonces hace fetch + reset, y devuelve la base de datos.
 */
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { join } from "path";
import { BASE_DATOS } from "../../lib/rutas.js";

const correr = promisify(exec);
const TMP = join(process.cwd(), "tmp");

async function git(comando) {
  const { stdout } = await correr(`git ${comando}`, { cwd: process.cwd(), maxBuffer: 8 * 1048576 });
  return stdout.trim();
}

export default {
  command: ["fix", "update", "actualizar"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto, db, from, PREFIX } = ctx;

    await enviartexto("⏳ *Buscando actualizaciones en GitHub…*");

    try {
      // ── 1. ¿hay cambios sin subir? ──────────────────────────────────────
      const sucios = (await git("status --porcelain")).split("\n").filter(Boolean);

      if (sucios.length) {
        fs.mkdirSync(TMP, { recursive: true });
        const marca = new Date().toISOString().replace(/[:.]/g, "-");
        const parche = join(TMP, `parche-${marca}.patch`);
        let guardado = false;
        try {
          const diff = await git("diff HEAD");
          fs.writeFileSync(parche, diff, "utf8");
          guardado = true;
        } catch {
          guardado = false;
        }

        // Confirmación con caducidad de 5 minutos, guardada por chat.
        const clave = "confirmarFix";
        db.chats ||= {};
        db.chats[from] ||= {};
        const pedido = Number(db.chats[from][clave]) || 0;
        const confirmado = pedido && Date.now() - pedido < 5 * 60_000;

        if (!confirmado) {
          db.chats[from][clave] = Date.now();
          db.saveDatabase?.();
          const lista = sucios.slice(0, 12).map((l) => `> ${l}`).join("\n");
          return enviartexto(
            `⚠️ *Hay ${sucios.length} archivo(s) con cambios sin subir.*\n\n${lista}` +
              (sucios.length > 12 ? `\n> …y ${sucios.length - 12} más` : "") +
              `\n\n${guardado ? `He guardado un parche en \`tmp/${parche.split("/").pop()}\`.\n` : ""}` +
              `> Si sigo, *esos cambios se pierden* (el código queda igual que en GitHub).\n` +
              `> Para seguir, escribe otra vez *${PREFIX}fix* en los próximos 5 minutos.\n` +
              `> Si no, no se toca nada.`
          );
        }
        delete db.chats[from][clave];
        db.saveDatabase?.();
      }

      // ── 2. respaldo de la base ──────────────────────────────────────────
      const dbBackup = fs.existsSync(BASE_DATOS) ? fs.readFileSync(BASE_DATOS, "utf8") : null;

      // ── 3. traer y aplicar ──────────────────────────────────────────────
      let resumen = "";
      try {
        await git("fetch origin main");
        const antes = await git("rev-parse --short HEAD");
        await git("reset --hard origin/main");
        const despues = await git("rev-parse --short HEAD");
        resumen = antes === despues ? `ya estaba al día (*${antes}*)` : `*${antes}* → *${despues}*`;
      } catch (err) {
        return enviartexto(`❌ No pude actualizar:\n_${err.message}_\n\n> El código no se ha tocado.`);
      }

      // ── 4. devolver la base de datos ────────────────────────────────────
      let baseOk = true;
      try {
        if (dbBackup) fs.writeFileSync(BASE_DATOS, dbBackup);
      } catch {
        baseOk = false;
      }

      await enviartexto(
        `✅ *Actualizado*\n\n> ${resumen}\n> Base de datos: ${baseOk ? "intacta" : "⚠️ no pude reescribirla (revisa lib/database.json)"}\n\n` +
          `♻️ Reiniciando para aplicar los cambios…`
      );

      // process.exit cierra el bot; en hostings (PM2, Railway) arranca solo.
      setTimeout(() => process.exit(0), 2000);
    } catch (error) {
      await enviartexto(`❌ Error inesperado: ${error.message}`);
    }
  },
};
