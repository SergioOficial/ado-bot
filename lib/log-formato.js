/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { inspect } from "node:util";

export function formatearLog(valor) {
  if (typeof valor === "string") return valor;
  return inspect(valor, { depth: 4, colors: false, maxArrayLength: 50, maxStringLength: 4000 });
}
