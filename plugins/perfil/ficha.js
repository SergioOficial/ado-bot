/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .setdesc / .deldesc        descripción personal
 * .setgenre / .delgenre      género
 * .sethobby / .delhobby      hobby
 * .setbirth / .delbirth      cumpleaños (DD/MM/AAAA o DD/MM)
 *
 * Todo va a `user.perfil`, y cada comando valida antes de guardar: el original
 * aceptaba cualquier cosa como fecha («32/13/9999») y luego el perfil mostraba
 * una edad negativa.
 */
const MAX = { desc: 200, genero: 30, hobby: 60 };

function usuario(db, sender) {
  const u = (db.users ||= {})[sender] ||= {};
  u.perfil ||= {};
  return u;
}

/** Valida una fecha DD/MM o DD/MM/AAAA y devuelve { dia, mes, anio }. */
export function leerFecha(texto) {
  const m = String(texto || "").trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = m[3] ? Number(m[3]) : null;
  if (mes < 1 || mes > 12) return null;
  // Días por mes (febrero con bisiesto cuando hay año).
  const bisiesto = anio ? (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0 : true;
  const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  if (dia < 1 || dia > dias) return null;
  if (anio !== null && (anio < 1900 || anio > new Date().getFullYear())) return null;
  return { dia, mes, anio };
}

export default {
  command: [
    "setdesc", "deldesc",
    "setgenre", "delgenre",
    "sethobby", "delhobby",
    "setbirth", "delbirth",
  ],
  execute: async (ctx) => {
    const { sender, args, comando, db, enviartexto } = ctx;
    const u = usuario(db, sender);
    const texto = (args || []).join(" ").trim();
    const campo = comando.replace(/^(set|del)/, "");
    const borrar = comando.startsWith("del");

    if (borrar) {
      if (!u.perfil[campo]) return enviartexto("《✧》 No tenías eso guardado.");
      delete u.perfil[campo];
      db.saveDatabase?.();
      const nombres = { desc: "descripción", genre: "género", hobby: "hobby", birth: "cumpleaños" };
      return enviartexto(`🗑️ Tu ${nombres[campo] || campo} quedó borrado.`);
    }

    if (!texto) {
      const ejemplos = {
        desc: "setdesc Me gusta el café y los gatos",
        genre: "setgenre Mujer",
        hobby: "sethobby Dibujar",
        birth: "setbirth 14/03/2003",
      };
      return enviartexto(`《✧》 Falta el dato.\n> Ejemplo: *${ctx.PREFIX}${ejemplos[campo] || "setdesc texto"}*`);
    }

    if (campo === "birth") {
      const f = leerFecha(texto);
      if (!f) {
        return enviartexto(
          `《✧》 Esa fecha no existe.\n> Formato: *DD/MM/AAAA* o *DD/MM*\n> Ejemplo: *${ctx.PREFIX}setbirth 14/03/2003*`
        );
      }
      u.perfil.birth = `${String(f.dia).padStart(2, "0")}/${String(f.mes).padStart(2, "0")}${f.anio ? `/${f.anio}` : ""}`;
      db.saveDatabase?.();
      return enviartexto(`🎂 Cumpleaños guardado: *${u.perfil.birth}*`);
    }

    const tope = MAX[campo] || 200;
    if (texto.length > tope) {
      return enviartexto(`《✧》 Eso pasa de *${tope}* caracteres. Acórtalo.`);
    }

    u.perfil[campo] = texto;
    db.saveDatabase?.();

    const nombres = { desc: "Descripción", genre: "Género", hobby: "Hobby" };
    return enviartexto(`✅ ${nombres[campo] || campo}: *${texto}*`);
  },
};
