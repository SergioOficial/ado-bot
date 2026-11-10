/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .restart — reiniciar, también cuando nadie me está vigilando.
 *
 * Antes esto era un `process.exit(0)` a secas: si arrancaste con `npm start` y
 * no hay supervisor (Termux, un VPS con nohup), el bot se apagaba **para
 * siempre**. Ahora hay tres caminos:
 *
 *   ipc       → hay supervisor (pm2, el vigía): se le pide el reinicio.
 *   relevo    → no hay supervisor, pero sí `scripts/vigia.mjs`: se deja el vigía
 *               arrancado en la misma terminal y se aparta.
 *   sin-salida→ instalación vieja, sin vigía: avisa y NO se apaga, que es peor
 *               quedarse sin bot que no reiniciar.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const VIGIA = path.join(RAIZ, "scripts", "vigia.mjs");

/** ¿Quién me está sosteniendo? Exportada para poder probarlo sin arrancar nada. */
export function decidirReinicio({ haySupervisor, hayVigia }) {
  if (haySupervisor) return "ipc";
  if (hayVigia) return "relevo";
  return "sin-salida";
}

/**
 * Deja el vigía corriendo en esta misma terminal y devuelve su pid.
 * No usa `detached`: así Ctrl+C sigue parándolo todo, como siempre.
 * Devuelve 0 si no se pudo arrancar, y entonces NO hay que salir.
 */
function pasarleElMando() {
  try {
    const hijo = spawn(process.execPath, [VIGIA, ...process.argv.slice(2)], {
      cwd: RAIZ,
      stdio: "inherit",
      env: { ...process.env, LEVI_RELEVO: "1" },
    });
    if (!hijo.pid) return 0;
    hijo.unref();
    return hijo.pid;
  } catch {
    return 0;
  }
}

export default {
  command: ["restart", "reiniciar"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;

    const camino = decidirReinicio({
      haySupervisor: typeof process.send === "function",
      hayVigia: fs.existsSync(VIGIA),
    });

    if (camino === "sin-salida") {
      return enviartexto(
        "「✧」 No puedo reiniciarme en esta instalación.\n" +
          "> Falta `scripts/vigia.mjs`, que es lo que vuelve a levantar el bot.\n" +
          "> Actualiza con *`.fix`* (o `git pull`) y vuelve a intentarlo.\n" +
          "> No me apago: quedarte sin bot es peor que no reiniciar."
      );
    }

    await enviartexto("「✧」 *Reiniciando…*\n> Espera unos segundos.");

    setTimeout(() => {
      if (camino === "ipc") {
        process.send("restart");
        return;
      }
      // Sin supervisor: me relevo y me voy. Si el vigía no arranca, seguir vivo
      // es mejor que quedarse sin bot.
      if (!pasarleElMando()) {
        console.error("⚠️ No pude arrancar el vigía: sigo vivo, sin reiniciar.");
        return;
      }
      process.exit(0);
    }, 2500);
  },
};
