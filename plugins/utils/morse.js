/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .morse <texto>    → texto a código morse
 * .demorse <código> → código morse a texto
 *
 * Al decodificar, las letras van pegadas y solo hay espacio donde había `/`
 * (igual que en Shin): el morse no separa letras con espacios, así que hay que
 * escribir la barra donde se quiera un espacio.
 */
const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", $: "...-..-", "@": ".--.-.",
};

const INVERTIDO = {};
for (const [letra, codigo] of Object.entries(MORSE)) INVERTIDO[codigo] = letra;

/** Texto → morse. Lo que no está en la tabla se deja tal cual. */
export function aMorse(texto) {
  return String(texto)
    .toUpperCase()
    .split("")
    .map((c) => (c === " " ? "/" : MORSE[c] ?? c))
    .join(" ");
}

/**
 * Morse → texto.
 * Devuelve `{ texto, raros }`: `raros` son los grupos que no existen en la
 * tabla, que salen como `?` en vez de desaparecer sin avisar.
 */
export function aTexto(codigo) {
  const grupos = String(codigo).trim().split(/\s+/).filter(Boolean);
  let raros = 0;
  const texto = grupos
    .map((g) => {
      if (g === "/") return " ";
      if (INVERTIDO[g] !== undefined) return INVERTIDO[g];
      raros++;
      return "?";
    })
    .join("");
  return { texto, raros };
}

export default {
  command: ["morse", "amorse", "codificarmorse", "demorse"],
  execute: async (ctx) => {
    const { comando, enviartexto, PREFIX } = ctx;
    const entrada = (ctx.args || []).join(" ").trim();

    if (!entrada) {
      return enviartexto(
        `《✧》 Escribe lo que quieres convertir.\n` +
          `> A morse: *${PREFIX}morse hola mundo*\n` +
          `> A texto: *${PREFIX}demorse .... --- .-.. .- / -- ..- -. -.. ---*`
      );
    }

    if (comando === "demorse") {
      const { texto, raros } = aTexto(entrada);
      const aviso = raros ? `\n> ⚠️ ${raros} grupo(s) no existen en morse: van como *?*` : "";
      return enviartexto(`📡 *DEMORSE*\n\n> ${texto}${aviso}`);
    }

    const codigo = aMorse(entrada);
    if (codigo.length > 3500) {
      return enviartexto("《✧》 Eso es demasiado largo para un mensaje. Prueba con menos texto.");
    }
    return enviartexto(
      `📡 *CÓDIGO MORSE*\n\n\`\`\`${codigo}\`\`\`\n\n_Para volver: ${PREFIX}demorse ${codigo.slice(0, 200)}${codigo.length > 200 ? "…" : ""}_`
    );
  },
};
