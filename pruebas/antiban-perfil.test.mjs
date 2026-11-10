/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
/**
 * El comando `.warmup`: que el perfil veterano se explique antes de activarse
 * y que no se pueda activar por accidente con un dedazo.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import warmup from "../plugins/owner/antiban.js";
import { crearLimitador, crearCola, crearSalud, AVISO_VETERANO } from "../lib/antiban.js";

const RAPIDO = { activo: true, baseMs: 1, minimoMs: 1, maximoMs: 2, diasCalentamiento: 7, inicioMsgsDia: 2, maxMsgsDia: 5, perfil: "auto" };

function montar(perfil = "auto") {
  const limitador = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, perfil } });
  global.antiban = {
    limitador,
    cola: crearCola({ limitador }),
    salud: crearSalud(),
    avisoVeterano: AVISO_VETERANO,
  };
  const dicho = { texto: "" };
  const ctx = (args = []) => ({
    args,
    comando: "warmup",
    enviartexto: async (t) => {
      dicho.texto = t;
    },
  });
  return { limitador, dicho, ctx };
}

export const pruebas = [
  ["pedir el perfil veterano solo lo explica, no lo activa", async () => {
    const { limitador, dicho, ctx } = montar();
    await warmup.execute(ctx(["veterano"]));
    esVerdad(dicho.texto.includes("veterano"), "lo nombra");
    esVerdad(/arriesgas/i.test(dicho.texto), "enseña el aviso completo");
    esVerdad(dicho.texto.includes("confirmar"), "dice cómo confirmarlo");
    igual(limitador.resumen().perfil, "auto", "no se ha cambiado nada");
  }],

  ["con la palabra de confirmación sí se activa", async () => {
    const { limitador, dicho, ctx } = montar();
    await warmup.execute(ctx(["veterano", "confirmar"]));
    igual(limitador.resumen().perfil, "veterano", "activado");
    igual(limitador.resumen().tope, RAPIDO.maxMsgsDia, "tope máximo desde hoy");
    esVerdad(dicho.texto.includes("veterano"), "lo confirma");
    esVerdad(/arriesgas/i.test(dicho.texto), "repite el aviso al activarlo");
  }],

  ["volver a auto no pide confirmación", async () => {
    const { limitador, ctx } = montar("veterano");
    igual(limitador.resumen().perfil, "veterano", "de partida veterano");
    await warmup.execute(ctx(["auto"]));
    igual(limitador.resumen().perfil, "auto", "vuelve a la rampa");
  }],

  ["un perfil inventado se rechaza y se dice cuáles hay", async () => {
    const { limitador, dicho, ctx } = montar();
    await warmup.execute(ctx(["perfil", "dios"]));
    igual(limitador.resumen().perfil, "auto", "no cambia");
    esVerdad(dicho.texto.includes("auto") && dicho.texto.includes("veterano"), "nombra los que existen");
  }],

  ["el resumen normal enseña el perfil en marcha", async () => {
    const { dicho, ctx } = montar("veterano");
    await warmup.execute(ctx([]));
    esVerdad(dicho.texto.includes("veterano"), "aparece el perfil");
    esVerdad(dicho.texto.includes("sin rampa"), "y se avisa de lo que implica");
  }],
];
