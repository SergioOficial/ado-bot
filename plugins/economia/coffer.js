/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .coffer <cantidad|all>   guardar en la caja fuerte
 * .coffer sacar <cantidad|all>   sacar
 * .coffer                  ver cuánto hay
 *
 * Para qué sirve: `.rob` solo alcanza el *efectivo*. Lo que está en la caja
 * fuerte no se lo lleva nadie. **No da intereses**: darlos sería fabricar dinero
 * sin que nadie lo gane, y en un bot eso se nota en una semana.
 */
import { usuario, dinero } from "../../lib/economia.js";

export default {
  command: ["coffer", "caja", "cajafuerte", "vault"],
  execute: async (ctx) => {
    const { sender, args, db, enviartexto, PREFIX } = ctx;
    const u = usuario(db, sender);

    const accion = String(args[0] || "").toLowerCase();
    const cantidadCruda = accion === "sacar" || accion === "retirar" ? args[1] : args[0];

    if (!cantidadCruda) {
      return enviartexto(
        `🔐 *Caja fuerte*\n\n│ Dentro › *${dinero(u.coffer)}*\n│ Efectivo › *${dinero(u.coins)}*\n╰─\n\n` +
          `> Guardar: *${PREFIX}coffer 10000* o *${PREFIX}coffer all*\n` +
          `> Sacar: *${PREFIX}coffer sacar 10000*\n` +
          `> Lo guardado aquí no lo toca *${PREFIX}rob*. No da intereses.`
      );
    }

    const sacar = accion === "sacar" || accion === "retirar";
    const disponible = sacar ? u.coffer : u.coins;
    const cantidad =
      String(cantidadCruda).toLowerCase() === "all" || String(cantidadCruda).toLowerCase() === "todo"
        ? disponible
        : Number(cantidadCruda);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return enviartexto("《✧》 Dime una cantidad entera mayor que 0 (o `all`).");
    }
    if (cantidad > disponible) {
      return enviartexto(
        `❌ No hay tanto: ${sacar ? "en la caja fuerte" : "en efectivo"} tienes *${dinero(disponible)}*.`
      );
    }

    if (sacar) {
      u.coffer -= cantidad;
      u.coins += cantidad;
    } else {
      u.coins -= cantidad;
      u.coffer += cantidad;
    }
    db.saveDatabase?.();

    return enviartexto(
      `${sacar ? "🔓 Sacaste" : "🔐 Guardaste"} *${dinero(cantidad)}*.\n\n` +
        `│ Caja fuerte › *${dinero(u.coffer)}*\n│ Efectivo › *${dinero(u.coins)}*\n╰─`
    );
  },
};
