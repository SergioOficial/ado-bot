/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * scripts/supervisor.mjs — levantar el bot y no dejarlo caído.
 *
 * El problema que resuelve: con `npm start` no hay nadie vigilando. `.restart`
 * hacía `process.exit(0)` y el bot se quedaba apagado para siempre; y si se caía
 * solo (memoria, red, un error tonto), igual. En Termux eso significa volver a
 * la terminal cada vez.
 *
 * Reglas:
 *   · si el bot pide reiniciar (IPC «restart»), se levanta otra vez y eso NO
 *     cuenta como caída;
 *   · si se muere solo, se levanta esperando 1, 2, 4, 8 y 15 s;
 *   · si se cae 5 veces en 2 minutos, se rinde: eso ya no lo arregla reiniciar
 *     más rápido.
 */
import { spawn } from "node:child_process";
import path from "node:path";

export const VENTANA_MS = 120_000;
export const MAX_CAIDAS = 5;
export const ESPERA_MAX_MS = 15_000;

const espera = (ms) => new Promise((listo) => setTimeout(listo, ms));

/**
 * @param {object} o
 * @param {string} o.raiz          carpeta del bot (donde vive index.js)
 * @param {string[]} [o.argumentos] argumentos para index.js
 * @param {object} [o.env]         variables extra para el hijo
 * @param {object} [o.ganchos]     arrancado · pidioReiniciar · reiniciando · cayo · rendido · parado
 */
export function crearSupervisor({ raiz, argumentos = [], env = {}, ganchos = {} } = {}) {
  const entrada = path.join(raiz, "index.js");

  let hijo = null;
  let parando = false;
  let caidas = [];
  let reinicios = 0;
  let estado = "detenido";

  const avisar = (nombre, datos) => {
    try {
      ganchos[nombre]?.(datos);
    } catch {
      // Un gancho que revienta no puede tumbar al que vigila.
    }
  };

  /** Un turno: arranca el hijo y espera a saber qué pasó. */
  async function turno() {
    if (parando) {
      estado = "detenido";
      return "parar";
    }

    estado = "arrancando";
    hijo = spawn(process.execPath, [entrada, ...argumentos], {
      cwd: raiz,
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: { ...process.env, ...env, LEVI_VIGILADO: "1" },
    });

    const pid = hijo.pid;
    avisar("arrancado", { pid });
    estado = "activo";

    hijo.on("message", (mensaje) => {
      if (mensaje === "restart") {
        reinicios += 1;
        estado = "reiniciando";
        avisar("pidioReiniciar", { reinicios });
        hijo.kill("SIGTERM");
      }
    });

    const { code, signal } = await new Promise((listo) => {
      hijo.on("exit", (codigo, senal) => listo({ code: codigo, signal: senal }));
    });
    hijo = null;

    if (parando) {
      estado = "detenido";
      avisar("parado", { motivo: "parado" });
      return "parar";
    }

    // SIGTERM después de un reinicio pedido: no es una caída.
    if (signal === "SIGTERM") {
      estado = "reiniciando";
      avisar("reiniciando", { reinicios });
      await espera(400);
      return "reiniciar";
    }

    const ahora = Date.now();
    caidas = caidas.filter((t) => ahora - t < VENTANA_MS);
    caidas.push(ahora);

    if (caidas.length >= MAX_CAIDAS) {
      estado = "rendido";
      avisar("rendido", { caidas: caidas.length, ventana: VENTANA_MS });
      return "rendirse";
    }

    const esperaMs = Math.min(1000 * 2 ** (caidas.length - 1), ESPERA_MAX_MS);
    estado = "esperando";
    avisar("cayo", { code, signal, esperaMs, intento: caidas.length });
    await espera(esperaMs);
    return "reiniciar";
  }

  /** Bucle principal. Termina solo si se para o si se rinde. */
  async function ejecutar() {
    for (;;) {
      const decision = await turno();
      if (decision !== "reiniciar") return decision === "parar" ? "parado" : "rendido";
    }
  }

  /** SIGTERM y, si a los 5 s sigue ahí, SIGKILL: un bot colgado no frena la salida. */
  function matar() {
    const victima = hijo;
    if (!victima) return false;
    victima.kill("SIGTERM");
    setTimeout(() => {
      if (victima.exitCode === null && victima.signalCode === null) victima.kill("SIGKILL");
    }, 5000).unref();
    return true;
  }

  function parar() {
    if (parando) return false;
    parando = true;
    if (!matar()) avisar("parado", { motivo: "sin-hijo" });
    return true;
  }

  function reiniciar() {
    reinicios += 1;
    estado = "reiniciando";
    return matar();
  }

  return {
    ejecutar,
    parar,
    reiniciar,
    get estado() {
      return estado;
    },
    get pid() {
      return hijo?.pid || 0;
    },
    get reinicios() {
      return reinicios;
    },
  };
}

export default crearSupervisor;
