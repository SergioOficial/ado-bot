/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
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
 *   3. guarda una copia de seguridad y comprueba que Git no siga la base.
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

      // riokuroxi-svg: guardar primero y conservar una copia, sin restaurarla
      // sobre cambios nuevos que puedan llegar mientras Git está trabajando.
      if (typeof global.saveDatabase !== "function" || !global.saveDatabase(true)) {
        return enviartexto("❌ No pude guardar la base; no se actualizará el código.");
      }
      fs.mkdirSync(TMP, { recursive: true });
      const respaldo = join(TMP, `base-fix-${Date.now()}-${process.pid}.json`);
      try {
        fs.copyFileSync(BASE_DATOS, respaldo, fs.constants.COPYFILE_EXCL);
      } catch (err) {
        return enviartexto(`❌ No pude respaldar la base: ${err.message}. No se actualizó el código.`);
      }

      let resumen = "";
      try {
        await git("fetch origin main");
        const seguida = await git("ls-files -- lib/database.json");
        const remota = await git("ls-tree -r --name-only origin/main -- lib/database.json");
        if (seguida || remota) {
          return enviartexto("❌ La base está controlada por Git en alguna de las revisiones. No se aplicó la actualización; revisa las rutas manualmente.");
        }
        const antes = await git("rev-parse --short HEAD");
        await git("reset --hard origin/main");
        const despues = await git("rev-parse --short HEAD");
        resumen = antes === despues ? `ya estaba al día (*${antes}*)` : `*${antes}* → *${despues}*`;
      } catch (err) {
        return enviartexto(`❌ No pude completar la actualización:\n_${err.message}_\n\n> Revisa el estado de Git antes de repetir.`);
      }

      // riokuroxi-svg: sin supervisor IPC no apagar un bot que no pueda volver.
      const supervisado = process.env.LEVI_VIGILADO === "1" && typeof process.send === "function" && process.connected;
      await enviartexto(
        `✅ *Actualizado*\n\n> ${resumen}\n> Base: guardada; copia privada en tmp.\n\n` +
          (supervisado ? "♻️ Solicitando reinicio al supervisor…" : "⚠️ Reinicia el bot manualmente desde el hosting para aplicar los cambios. No me apago automáticamente.")
      );
      if (supervisado) {
        setTimeout(() => {
          try { process.send("restart"); } catch (err) { console.error("⚠️ No se pudo solicitar el reinicio:", err?.message || err); }
        }, 2000);
      }
    } catch (error) {
      await enviartexto(`❌ Error inesperado: ${error.message}`);
    }
  },
};
