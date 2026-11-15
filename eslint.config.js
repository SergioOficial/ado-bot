/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * eslint.config.js — reglas que atrapan bugs, no opiniones de estilo.
 *
 * Por qué existe, con fecha y apellido: el bot estuvo días sin poder arrancar
 * por un bloque a medio escribir en index.js, y antes de eso llevaba un
 * `ReferenceError` sembrado en el manejador de mensajes que apagaba el proceso
 * con un solo mensaje propio. Las 229 pruebas no vieron ninguna de las dos
 * cosas, y `node --check` solo mira la sintaxis archivo por archivo.
 *
 * `no-undef` las veía en seco. Corrido sobre el index.js anterior al arreglo:
 *
 *     450:33  error  'PREFIX' is not defined   no-undef
 *
 * Y sobre el árbol de hoy encontró tres bugs que las pruebas dejaban pasar:
 * `dormir()` fuera de ámbito en lib/antiban.js (la espera de ritmo humano no
 * ocurría nunca y el error se lo comía un catch vacío), `{ text }` en vez de
 * `{ text: texto }` en .say, y una aserción tautológica en las pruebas de
 * botones. Los tres están en pruebas/regresion-lint.test.mjs.
 *
 * Mismo criterio que en Shin-MD: el estilo lo decide quien lo lea; aquí solo va
 * lo que puede romper el bot. Las de higiene arrancan en "warn" para no pintar
 * de rojo un repo ya escrito, y se suben a "error" cuando el conteo llegue a
 * cero (`npm run lint`).
 */
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "session/**",
      "Sessions/**",
      "sub/**",
      "tmp/**",
      "logs/**",
      "media/**",
      "assets/**",
      "**/*.min.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // ── Bugs reales: error desde el día uno ─────────────────────────────
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
      "no-cond-assign": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-unsafe-negation": "error",
      "no-self-assign": "error",
      "no-var": "error",

      // ── Falso positivo aquí ─────────────────────────────────────────────
      // Los menús y las tarjetas usan U+3000 (espacio ideográfico) y bordes
      // decorativos dentro de template strings a propósito: es el lenguaje
      // visual del bot. Sin saltarse strings y plantillas, ESLint marca errores
      // que son diseño, y un `--fix` automático destrozaría los menús.
      "no-irregular-whitespace": [
        "error",
        { skipStrings: true, skipTemplates: true, skipComments: false, skipRegExps: true },
      ],

      // ── Higiene: warn ahora, error cuando esté limpio ───────────────────
      // `allowEmptyCatch` va en true porque hay catch vacíos legítimos (un
      // borrado que no importa si falla). OJO: eso no los vuelve seguros — el
      // bug de `dormir()` vivía dentro de uno con su comentario explicativo, así
      // que ninguna regla de estas lo habría visto. Lo que lo vio fue no-undef.
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "no-async-promise-executor": "warn",
      "require-atomic-updates": "warn",
      eqeqeq: ["warn", "smart"],
      "prefer-const": "warn",
    },
  },
  {
    // Los plugins declaran su propia forma en el objeto exportado y reciben un
    // ctx del router: las variables «sin usar» ahí suelen ser destructuring
    // documental, no descuido.
    files: ["plugins/**/*.js"],
    rules: { "no-unused-vars": "off" },
  },
  {
    // Las pruebas leen la fuente de otros archivos como texto (para asegurar que
    // un fallo escrito tal cual no vuelve) y arman mensajes falsos con formas
    // imposibles a propósito. Ahí `no-undef` y las comparaciones raras son la
    // prueba misma, no un bug.
    files: ["pruebas/**/*.{js,mjs}", "scripts/**/*.{js,mjs}"],
    rules: { "no-constant-binary-expression": "off" },
  },
];
