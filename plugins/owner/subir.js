/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * .subir <ruta> | <contenido> — escribe o actualiza un archivo del bot desde
 * WhatsApp, sin abrir Termux.
 *
 * Seguridad, porque esto escribe en el disco:
 *   · solo el dueño;
 *   · la ruta **siempre** se resuelve dentro de la carpeta del bot (nada de
 *     `../` para escapar);
 *   · `.git/` está protegido;
 *   · tope de 200 000 caracteres por mensaje.
 *
 * Al terminar dice el tamaño y si el archivo antes existía. Y avisa de lo único
 * que hay que saber: un plugin nuevo **no** aparece hasta reiniciar.
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const MAX_CARACTERES = 200_000;

/**
 * Resuelve la ruta pedida contra la raíz del bot.
 * @returns {{ok:true, ruta:string, relativa:string} | {ok:false, error:string}}
 */
export function resolverRuta(raiz, rutaCruda) {
  const crudo = String(rutaCruda || "").trim();
  if (!crudo) return { ok: false, error: "Falta la ruta." };
  if (crudo.includes("\0")) return { ok: false, error: "Ruta inválida." };

  const destino = path.resolve(raiz, crudo);
  if (destino !== raiz && !destino.startsWith(raiz + path.sep)) {
    return { ok: false, error: "🚫 Ruta no permitida: no puedes salir de la carpeta del bot." };
  }

  const relativa = path.relative(raiz, destino);
  if (relativa === ".git" || relativa.startsWith(".git" + path.sep)) {
    return { ok: false, error: "🚫 `.git/` está protegido." };
  }
  // riokuroxi-svg: como en Shin-MD, no confiar solo en la ruta textual.
  // Se rechaza cualquier enlace, incluso uno roto o que apunte dentro del bot.
  let actual = raiz;
  for (const parte of relativa.split(path.sep).filter(Boolean)) {
    actual = path.join(actual, parte);
    try {
      if (fs.lstatSync(actual).isSymbolicLink()) {
        return { ok: false, error: "🚫 No se permiten enlaces simbólicos." };
      }
    } catch (err) {
      if (err.code === "ENOENT") break;
      return { ok: false, error: "🚫 No pude comprobar la ruta." };
    }
  }
  return { ok: true, ruta: destino, relativa };
}

export default {
  command: ["subir", "upload", "escribir"],
  isOwner: true,
  execute: async (ctx) => {
    const { texto, enviartexto, PREFIX } = ctx;

    // Se usa el texto tal cual llegó (sin el prefijo ni el comando), porque el
    // contenido puede tener saltos de línea y comillas de un código entero.
    const crudo = String(texto || "").replace(/^\S*\s*/, "");
    if (!crudo.includes("|")) {
      return enviartexto(
        `《✧》 Uso: *${PREFIX}subir <ruta> | <contenido>*\n` +
          `> Ejemplo: *${PREFIX}subir notas.txt | hola mundo*\n` +
          `> La ruta es relativa a la carpeta del bot y no puede salirse con \`..\`.\n` +
          `> Sirve para editar un plugin desde el móvil; un plugin nuevo pide reiniciar.`
      );
    }

    const corte = crudo.indexOf("|");
    const rutaCruda = crudo.slice(0, corte).trim();
    // Se quita UN espacio o salto tras la barra, nunca más: la indentación del
    // código es parte del contenido.
    const contenido = crudo.slice(corte + 1).replace(/^[ \t]?\n?/, "");

    if (contenido.length > MAX_CARACTERES) {
      return enviartexto(
        `《✧》 Contenido demasiado largo (${contenido.length} caracteres, máximo ${MAX_CARACTERES}).`
      );
    }

    const resuelto = resolverRuta(RAIZ, rutaCruda);
    if (!resuelto.ok) return enviartexto(resuelto.error);

    if (fs.existsSync(resuelto.ruta) && fs.statSync(resuelto.ruta).isDirectory()) {
      return enviartexto("🚫 Esa ruta es una carpeta, no un archivo.");
    }

    const existia = fs.existsSync(resuelto.ruta);
    try {
      fs.mkdirSync(path.dirname(resuelto.ruta), { recursive: true });
      fs.writeFileSync(resuelto.ruta, contenido, "utf8");
    } catch (err) {
      return enviartexto(`❌ No pude escribir: ${err.message}`);
    }

    const peso = Buffer.byteLength(contenido, "utf8");
    const esPlugin = resuelto.relativa.startsWith("plugins" + path.sep);
    return enviartexto(
      `✅ *${existia ? "Actualizado" : "Creado"}*\n\n` +
        `> Archivo: \`${resuelto.relativa}\`\n` +
        `> Tamaño: *${peso}* bytes\n` +
        (esPlugin ? `> Es un plugin: reinicia el bot para que tome efecto.\n` : "") +
        `> Léelo con *${PREFIX}getplugin ${path.basename(resuelto.relativa, ".js")}* si es un plugin.`
    );
  },
};
