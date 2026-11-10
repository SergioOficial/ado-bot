/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * lib/grupo.js — todo lo que hay que saber de un grupo, en un sitio.
 *
 * Los datos de administración se guardan en la base del bot:
 *
 *   db.chats[chat].warnLimit   cuántas advertencias antes de avisar (3)
 *   db.chats[chat].expulsar    si al llegar al límite se expulsa (no)
 *   db.chats[chat].warns       { "jid": [{ razon, fecha, por }] }
 *   db.chats[chat].antilink    avisar y borrar enlaces de invitación
 *
 * Comparar JID contra JID es el error clásico: WhatsApp puede dar el mismo
 * teléfono como `@s.whatsapp.net` o como `@lid`, y un admin de verdad quedaba
 * como «no autorizado». Aquí se compara por número, mirando todas las formas.
 */

/** El número de un JID, sin dispositivo ni servidor. */
export function numeroDe(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

/** Todas las formas del JID de un participante (id, lid, phoneNumber). */
function formasDe(participante) {
  return [participante?.id, participante?.lid, participante?.phoneNumber, participante?.jid]
    .filter(Boolean)
    .map((j) => String(j));
}

/** Participantes del grupo, o [] si no se pudo leer. */
export async function participantes(sock, chat) {
  const meta = await sock.groupMetadata(chat).catch(() => null);
  return meta?.participants || [];
}

export function esAdminMeta(lista, jid) {
  const buscado = numeroDe(jid);
  if (!buscado) return false;
  return lista.some((p) => p?.admin && formasDe(p).some((f) => numeroDe(f) === buscado));
}

/** ¿El que escribe es administrador (o dueño del bot)? */
export async function esAdmin(sock, chat, jid, esOwner = false) {
  if (esOwner) return true;
  return esAdminMeta(await participantes(sock, chat), jid);
}

/** ¿El propio bot es administrador del grupo? */
export async function botEsAdmin(sock, chat) {
  const lista = await participantes(sock, chat);
  const botJid = sock.user?.id || sock.user?.jid;
  return esAdminMeta(lista, botJid);
}

/** El JID de una persona a partir de la mención, la cita o un número suelto. */
export function objetivo(ctx) {
  const { m, args = [] } = ctx;

  const mencion = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mencion) return mencion;

  const citado = m.message?.extendedTextMessage?.contextInfo?.participant;
  if (citado) return citado;

  // Un número escrito a mano (con o sin +).
  for (const a of args) {
    const limpio = String(a).replace(/[^\d]/g, "");
    if (limpio.length >= 8 && limpio.length <= 15) return `${limpio}@s.whatsapp.net`;
  }
  return null;
}

/** «@52155… (Nombre)» para los mensajes. */
export function mencion(jid, db) {
  const numero = numeroDe(jid);
  const nombre = db?.users?.[jid]?.nombre || db?.users?.[jid]?.name || "";
  return nombre ? `@${numero} (${nombre})` : `@${numero}`;
}

/** Caja de advertencias del grupo. */
export function cajaWarns(db, chat) {
  const c = (db.chats ||= {})[chat] ||= {};
  c.warns ||= {};
  return c;
}

/**
 * Las advertencias de una persona.
 *
 * En el JS de Shin se guardaba un array que a veces volvía como texto y había
 * que parsear a mano; aquí se normaliza siempre al leer, y si el JSON está roto
 * se empieza de cero en vez de reventar el comando.
 */
export function warnsDe(db, chat, jid) {
  const c = cajaWarns(db, chat);
  let lista = c.warns[jid];
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) lista = [];
  c.warns[jid] = lista;
  return lista;
}

export function ponerWarns(db, chat, jid, lista) {
  const c = cajaWarns(db, chat);
  c.warns[jid] = lista;
}

export function limiteDe(db, chat) {
  const c = (db.chats ||= {})[chat] ||= {};
  return Number.isInteger(c.warnLimit) && c.warnLimit > 0 ? c.warnLimit : 3;
}

/** Fecha corta y legible, en la zona del servidor. */
export function fecha(ms = Date.now()) {
  return new Date(ms).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
