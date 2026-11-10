/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .eval <código> — ejecutar JavaScript dentro del bot y ver el resultado.
 *
 * Es el hermano de `.exec` (que ejecuta comandos del sistema). Sirve para
 * comprobar una cosa rápido desde el móvil sin abrir Termux:
 *
 *   .eval db.users[sender].coins
 *   .eval Object.keys(db.chats).length
 *   .eval await sock.groupMetadata(from).then(g => g.participants.length)
 *
 * Solo el dueño, y con dos frenos: el resultado se recorta (un objeto enorme no
 * se puede leer en WhatsApp) y no hay `require` — para eso ya está `.exec`.
 */
const MAX_SALIDA = 3000;

/** Deja el resultado en algo que se pueda leer en un chat. */
export function legible(valor) {
  let texto;
  if (typeof valor === "string") texto = valor;
  else if (valor instanceof Error) texto = `${valor.name}: ${valor.message}`;
  else {
    try {
      texto = JSON.stringify(valor, null, 2);
    } catch {
      texto = String(valor); // referencias circulares
    }
  }
  texto ??= String(valor);
  if (texto.length > MAX_SALIDA) {
    return `${texto.slice(0, MAX_SALIDA)}\n…(recortado: ${texto.length} caracteres)`;
  }
  return texto;
}

export default {
  command: ["eval", "evaluar", "ex"],
  isOwner: true,
  execute: async (ctx) => {
    const { texto, sock, db, config, enviartexto, PREFIX } = ctx;
    const codigo = String(texto || "").replace(/^\S*\s*/, "").trim();

    if (!codigo) {
      return enviartexto(
        `《✧》 Uso: *${PREFIX}eval <código JavaScript>*\n` +
          `> Ejemplo: ${PREFIX}eval 1 + 1\n` +
          `> Tienes a mano \`sock\`, \`db\`, \`config\`, \`ctx\` y \`args\`.\n` +
          `> Para comandos del sistema: *${PREFIX}exec*.\n` +
          `> Ojo: aquí no hay \`require\`.`
      );
    }

    let salida;
    try {
      // Las variables están a la vista para que el código pueda usarlas sin
      // tener que buscarlas en globales.
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
      const fn = new AsyncFunction("sock", "db", "config", "ctx", "args", codigo);
      const resultado = await fn(sock, db, config, ctx, ctx.args || []);
      salida = `✅ *Resultado*\n\n${legible(resultado)}`;
    } catch (err) {
      salida = `❌ *Error*\n\n${legible(err)}`;
    }

    return enviartexto(salida);
  },
};
