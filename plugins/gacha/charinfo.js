/**
 * plugins/gacha/charinfo.js — `.charinfo` · `.winfo` · `.waifuinfo`
 *
 * La ficha de un personaje: quién lo tiene, cuánto vale, de qué serie sale y en
 * qué puesto va dentro del grupo. Busca por nombre, por varias palabras o por
 * el tag (`aru_(blue_archive)`).
 *
 * Busca en tres pasadas y en ese orden: nombre exacto, nombre que contenga lo
 * escrito, y por último cualquier palabra suelta. Así «Aru» no acaba eligiendo
 * un «Aru Swimsuit» cualquiera cuando existe el «Aru» a secas, pero escribir
 * «blue archive» sigue encontrando algo.
 */

import {
  cargarPersonajes,
  aplanar,
  chatDeGacha,
  gachaApagado,
  miles,
  fechaCorta,
} from "../../lib/gacha.js";

export default {
  command: ["charinfo", "winfo", "waifuinfo"],

  execute: async (ctx) => {
    const { from, args, enviartexto, db, PREFIX } = ctx;

    const chat = chatDeGacha(db, from);
    if (gachaApagado(chat)) {
      return enviartexto(
        `ꕥ Los comandos de *Gacha* están apagados en este chat.\n> Un administrador los enciende con *${PREFIX}gacha on*`
      );
    }

    if (!args.length) {
      return enviartexto(
        `❀ ¿De quién quieres la ficha?\n> Ejemplo: *${PREFIX}charinfo Aru* o *${PREFIX}charinfo blue archive*`
      );
    }

    const json = await cargarPersonajes();
    const personajes = aplanar(json);
    const consulta = args.join(" ").toLowerCase().trim();
    const palabras = consulta.split(/\s+/).filter((p) => p.length > 1);

    const enChat = (c) => Boolean(chat.characters[String(c.id)]?.user);
    const conDueño = (lista) => lista.find(enChat) || lista[0];

    const exactos = personajes.filter((c) => String(c.name).toLowerCase() === consulta);
    const personaje =
      (exactos.length ? conDueño(exactos) : null) ||
      personajes.find((c) => String(c.name).toLowerCase().includes(consulta)) ||
      personajes.find((c) =>
        (c.tags || []).some((t) => String(t).toLowerCase().includes(consulta.replace(/\s+/g, "_")))
      ) ||
      personajes.find((c) =>
        palabras.some(
          (p) =>
            String(c.name).toLowerCase().includes(p) ||
            (c.tags || []).some((t) => String(t).toLowerCase().includes(p))
        )
      );

    if (!personaje) {
      return enviartexto(`ꕥ No encontré a *${consulta}*.\n> Prueba con el nombre tal cual o con su serie.`);
    }

    const ficha = chat.characters[String(personaje.id)] || {};
    const valor = Number(ficha.value) || Number(personaje.value) || 100;

    // Puesto dentro de lo reclamado en este chat.
    const ranking = Object.values(chat.characters || {})
      .filter((c) => c.user)
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    const puesto = ranking.findIndex((c) => (c.name || "") === (ficha.name || personaje.name)) + 1;

    const dueño = ficha.user ? nombreDe(db, ficha.user) : null;
    const lineas = [
      `❀ Nombre » *${ficha.name || personaje.name}*`,
      `⚥ Género » *${personaje.gender || "Desconocido"}*`,
      `✰ Valor » *${miles(valor)}*`,
      `♡ Estado » *${dueño ? `Reclamado por ${dueño}` : "Libre"}*`,
      `❖ Fuente » *${personaje.serie}*`,
    ];

    if (dueño && ficha.claimedAt) lineas.push(`ⴵ Reclamado el » *${fechaCorta(ficha.claimedAt)}*`);
    if (puesto) lineas.push(`❏ Puesto en el grupo » *#${puesto}* de ${ranking.length}`);
    lineas.push(`⌗ Tag » \`${personaje.tags?.[0] || "—"}\``);

    return enviartexto(lineas.join("\n"));
  },
};

function nombreDe(db, jid) {
  const u = db.users?.[jid];
  return u?.nombre || u?.name || String(jid || "").split("@")[0];
}
