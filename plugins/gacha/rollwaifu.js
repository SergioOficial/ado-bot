/**
 * plugins/gacha/rollwaifu.js — `.rw` · `.roll` · `.rollwaifu`
 *
 * Tira un personaje al azar de `lib/characters.json`, le busca una imagen en
 * Safebooru (y si no hay, en Danbooru), la baja y la manda con la ficha. El
 * mensaje queda "vivo" 60 segundos: quien lo cite (o escriba `.claim` sin citar)
 * dentro de ese rato se lo lleva.
 *
 * TIEMPOS, QUE ES LO QUE AQUÍ IMPORTA
 * -----------------------------------
 * Un `.rw` hace tres cosas por red: buscar (hasta 8 s por proveedor), bajar la
 * imagen (hasta 15 s) y enviarla. Lo que se ve en el grupo es la suma. Por eso
 * el plazo de búsqueda es corto y el personaje se cambia hasta tres veces si no
 * trae imagen: mejor 2 segundos de más que un mensaje sin foto.
 */

import {
  cargarPersonajes,
  aplanar,
  serieDe,
  tirarPersonaje,
  chatDeGacha,
  gachaApagado,
  limpiarRolls,
  miles,
  restante,
} from "../../lib/gacha.js";

/** Lo que dura el personaje tirado antes de esfumarse. */
const VIVE = 60_000;

/** Lo que queda reservado para quien lo tiró, antes de que lo pueda pisar otro. */
const RESERVA = 20_000;

/** Espera entre tiradas del mismo usuario. */
const ESPERA = 15 * 60 * 1000;

/** El mismo toque llegando dos veces no puede tirar dos personajes. */
const enCurso = new Map();

export default {
  command: ["rw", "roll", "rollwaifu"],

  execute: async (ctx) => {
    const { sock, from, m, sender, enviartexto, db, PREFIX } = ctx;

    const chat = chatDeGacha(db, from);
    if (gachaApagado(chat)) {
      return enviartexto(
        `ꕥ Los comandos de *Gacha* están apagados en este chat.\n> Un administrador los enciende con *${PREFIX}gacha on*`
      );
    }

    // Doble toque: se ignora el segundo sin decir nada.
    const ahora = Date.now();
    if (enCurso.has(sender) && ahora - enCurso.get(sender) < 15_000) return;

    const mio = (chat.users[sender] ||= {});
    if (mio.lastRoll && ahora < mio.lastRoll) {
      return enviartexto(`ꕥ Espera *${restante(mio.lastRoll - ahora)}* para volver a tirar.`);
    }

    enCurso.set(sender, ahora);
    limpiarRolls(chat, ahora);

    try {
      const json = await cargarPersonajes();
      const personajes = aplanar(json);
      if (!personajes.length) {
        return enviartexto("❌ No hay personajes cargados. Revisa *lib/characters.json*.");
      }

      const tirado = await tirarPersonaje(personajes);
      if (!tirado) {
        return enviartexto(
          "ꕥ Safebooru y Danbooru no devolvieron ninguna imagen esta vez.\n> Prueba otra vez en un momento."
        );
      }

      const { personaje, imagen } = tirado;
      const id = String(personaje.id);
      const serie = personaje.serie || serieDe(json, id);

      // La ficha del personaje en este chat. Si ya existía, se respeta lo que
      // hubiera (valor y dueño): tirar otra vez no borra un reclamo.
      const ficha = (chat.characters[id] ||= {
        name: personaje.name,
        value: Number(personaje.value) || 100,
      });
      ficha.name ||= personaje.name;
      if (typeof ficha.value !== "number") ficha.value = Number(personaje.value) || 100;

      ficha.expiresAt = ahora + VIVE;
      ficha.reservedBy = sender;
      ficha.reservedUntil = ahora + RESERVA;

      const dueño = ficha.user ? nombreDe(db, ficha.user) : null;
      const fichaTexto = [
        `❀ Nombre » *${ficha.name}*`,
        `⚥ Género » *${personaje.gender || "Desconocido"}*`,
        `✰ Valor » *${miles(ficha.value)}*`,
        `♡ Estado » *${dueño ? `Reclamado por ${dueño}` : "Libre"}*`,
        `❖ Fuente » *${serie}*`,
        dueño ? "" : `⏳ Tienes *${VIVE / 1000}s* para reclamarlo`,
      ]
        .filter(Boolean)
        .join("\n");

      const enviado = await sock.sendMessage(
        from,
        { image: imagen.buffer, mimetype: imagen.tipo, caption: fichaTexto },
        { quoted: m }
      );

      const msgId = enviado?.key?.id;
      if (msgId) {
        chat.rolls[msgId] = {
          id,
          name: ficha.name,
          tirado: ahora,
          expiresAt: ficha.expiresAt,
          reservedBy: sender,
          reservedUntil: ficha.reservedUntil,
        };
        // El último tiro del chat: es lo que reclama `.claim` sin citar nada.
        chat.ultimoRoll = msgId;
      }

      mio.lastRoll = ahora + ESPERA;
      return enviado;
    } catch (err) {
      return enviartexto(`❌ No se pudo tirar el personaje.\n_${err.message}_`);
    } finally {
      enCurso.delete(sender);
    }
  },
};

function nombreDe(db, jid) {
  const u = db.users?.[jid];
  return u?.nombre || u?.name || String(jid || "").split("@")[0];
}
