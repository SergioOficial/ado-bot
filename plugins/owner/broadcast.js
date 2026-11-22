/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * plugins/owner/broadcast.js — difusión con freno.
 *
 * QUÉ CAMBIÓ Y POR QUÉ
 * --------------------
 * La versión anterior mandaba el MISMO texto, cada 5 segundos, a todos los
 * usuarios guardados. Eso es exactamente lo que WhatsApp llama mensajería
 * masiva: mismo contenido, mismo ritmo, destinatarios que en su mayoría nunca
 * escribieron al bot. Es la forma más rápida de que reporten el número, y con
 * varias denuncias la cuenta queda restringida (y a veces con el caso abierto
 * en soporte).
 *
 * Lo que hace ahora, sin cambiar el texto del mensaje:
 *
 *   1. Pide confirmación: primero enseña a cuántos va y a quiénes, y no manda
 *      nada hasta `.bc confirmar` dentro de los dos minutos siguientes.
 *   2. Solo escribe a quien ha usado el bot (`db.users` con actividad). A los
 *      que no, no se les escribe.
 *   3. Respeta el tope diario del anti-ban y deja margen para lo que el bot
 *      tiene que contestar: una difusión no puede comerse la cuota del día.
 *   4. Espacia con espera variable (no 5 s fijos, que es un reloj).
 *   5. Se para sola: tres fallos seguidos, o un error que huela a restricción,
 *      y termina en vez de insistir.
 *   6. Cuenta qué pasó: enviados, omitidos y por qué.
 */
import { crearLimitador, gaussiana } from "../../lib/antiban.js";

/** Máximo por tanda. Más que esto no es una difusión, es un disparo. */
const MAX_POR_TANDA = 25;
/** Cuánta cuota del día se deja libre para lo que el bot tenga que contestar. */
const RESERVA_DIARIA = 10;
/** Espera entre envíos: media y desviación, en milisegundos (25 s ± 12 s). */
const ESPERA_MEDIA_MS = 25_000;
const ESPERA_DESV_MS = 12_000;
/** Cuánto vale la confirmación pendiente. */
const VIGENCIA_CONFIRMACION_MS = 120_000;

/** Confirmaciones pendientes: jid del dueño → { texto, para, cuando }. */
const pendientes = new Map();

/** ¿Ese JID es una persona a la que se le puede escribir? */
function esPersona(jid) {
  const texto = String(jid || "");
  if (!texto.endsWith("@s.whatsapp.net")) return false;
  if (/@(g\.us|broadcast|newsletter)$/.test(texto)) return false;
  return true;
}

/** ¿Ese usuario ha usado el bot alguna vez? Sin actividad, no se le escribe. */
function haUsadoElBot(datos) {
  if (!datos || typeof datos !== "object") return false;
  return ["xp", "level", "coins", "bank", "coffer", "afk", "nombre", "name", "edad", "genero"].some(
    (campo) => datos[campo] !== undefined && datos[campo] !== null && datos[campo] !== false
  );
}

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Espera variable con forma de campana: nunca el mismo número dos veces. */
function esperaVariable() {
  return Math.max(8_000, Math.round(gaussiana(ESPERA_MEDIA_MS, ESPERA_DESV_MS)));
}

/** ¿El error tiene pinta de restricción de la cuenta? */
function pareceRestriccion(err) {
  const texto = String(err?.message || err || "");
  const codigo = Number(err?.output?.statusCode ?? err?.statusCode ?? 0);
  if (codigo === 403 || codigo === 463) return true;
  return /spam|restricted|blocked|forbidden|not authorized|too many/i.test(texto);
}

export default {
  command: ["bc", "broadcast", "difundir"],
  isOwner: true, // 👈 Solo los owners pueden usarlo
  execute: async (ctx) => {
    const { sock, from, m, sender, args, enviartexto, db, config } = ctx;
    const text = args.join(" ").trim();
    const propio = sender || from;

    // ── Paso 2: confirmación ────────────────────────────────────────────────
    if (/^confirmar$/i.test(text)) {
      const pendiente = pendientes.get(propio);
      if (!pendiente) {
        return enviartexto(
          "⚠️ No hay ninguna difusión esperando. Escribe primero el mensaje: " +
            `${config.prefix}bc <mensaje>`
        );
      }
      if (Date.now() - pendiente.cuando > VIGENCIA_CONFIRMACION_MS) {
        pendientes.delete(propio);
        return enviartexto("⌛ La confirmación caducó (dos minutos). Escribe el mensaje otra vez.");
      }
      pendientes.delete(propio);
      return ejecutarDifusion({ ctx, sock, from, m, enviartexto, db, config, texto: pendiente.texto, para: pendiente.para });
    }

    // ── Paso 3: si estaba esperando otra cosa, se descarta ──────────────────
    pendientes.delete(propio);

    if (!text) {
      return enviartexto(
        `📢 *Uso:* ${config.prefix}bc <mensaje>\n` +
          "_Primero te enseño a cuántos va y a quiénes; el mensaje sale cuando confirmes._"
      );
    }

    // ── Paso 1: a quién llegaría y con cuánta cuota cuenta ──────────────────
    const todos = Object.keys(db.users || {});
    const personas = todos.filter((id) => esPersona(id));
    const conActividad = personas.filter((id) => haUsadoElBot(db.users[id]));
    const sinActividad = personas.length - conActividad.length;

    if (!conActividad.length) {
      return enviartexto(
        "⚠️ No hay nadie a quien escribir: no hay usuarios registrados que hayan usado el bot."
      );
    }

    const limitador = crearLimitador({ estado: db.antiban ||= {} });
    const resumen = limitador.resumen();
    const cuotaLibre = Math.max(0, resumen.tope - resumen.msgsHoy);
    const margen = Math.max(0, cuotaLibre - RESERVA_DIARIA);
    const para = conActividad.slice(0, Math.min(MAX_POR_TANDA, margen));

    const cabecera = [
      "📢 *Difusión — vista previa*",
      "",
      `> Usuarios guardados: *${personas.length}*`,
      `> Con actividad (recibirían): *${conActividad.length}*`,
      `> Sin actividad (se omiten): *${sinActividad}*`,
      "",
      `> Tope de hoy: *${resumen.tope === Infinity ? "sin límite" : resumen.tope}* · enviados: *${resumen.msgsHoy}* · libres: *${cuotaLibre}*`,
      `> Se dejan *${RESERVA_DIARIA}* para contestar.`,
      `> *Esta tanda: ${para.length}*${para.length < conActividad.length ? ` de ${conActividad.length} (el resto, en otra tanda)` : ""}`,
      "",
    ];

    if (!para.length) {
      cabecera.push(
        "🚫 *No se puede difundir ahora.* La cuota del día está gastada o no queda margen tras la reserva.",
        "",
        "> Espera a mañana o sube el tope con `.warmup`.",
        "> Una cuenta nueva que empieza a mandar en masa es la que acaba restringida."
      );
      return enviartexto(cabecera.join("\n"));
    }

    cabecera.push(
      `*Mensaje:*`,
      "```",
      text.slice(0, 400) + (text.length > 400 ? "…" : ""),
      "```",
      "",
      `Para enviarlo: *${config.prefix}bc confirmar* (caduca en 2 minutos).`,
      "_Va con espera variable entre envíos y se para sola si WhatsApp empieza a rechazar._"
    );

    pendientes.set(propio, { texto: text, para, cuando: Date.now() });
    await enviartexto(cabecera.join("\n"));
  },
};

/** La tanda, ya confirmada. */
async function ejecutarDifusion({ ctx, sock, from, m, enviartexto, db, config, texto, para }) {
  await sock.sendMessage(from, { react: { text: "📢", key: m.key } }).catch(() => {});
  await enviartexto(
    `🚀 *Difusión en marcha*\n\n> Destinatarios: *${para.length}*\n> Espera variable de 15 s a 40 s entre envíos.\n> Si algo va mal, paro y te digo qué pasó.`
  );

  let enviados = 0;
  const omitidos = [];
  let fallosSeguidos = 0;
  let motivoParada = null;

  for (const [indice, id] of para.entries()) {
    // Nunca a uno mismo: el bot no se escribe a su propio número.
    if (id === (ctx.sender || "")) {
      omitidos.push(`${id} (es quien ordena)`);
      continue;
    }

    if (indice > 0) await dormir(esperaVariable());

    try {
      await sock.sendMessage(id, {
        text: `*📢 𝐃𝐈𝐅𝐔𝐒𝐈Ó𝐍 𝐎𝐅𝐈𝐂𝐈𝐀𝐋*\n\n${texto}\n\n> ${config.botName}`,
      });
      enviados++;
      fallosSeguidos = 0;
      db.saveDatabase?.();
    } catch (err) {
      fallosSeguidos++;
      console.error(`❌ Error al enviar difusión a ${id}:`, err?.message || err);
      omitidos.push(`${id} (${err?.message || "error"})`);
      if (pareceRestriccion(err)) {
        motivoParada = "WhatsApp rechazó un envío como si la cuenta estuviera limitada.";
        break;
      }
      if (fallosSeguidos >= 3) {
        motivoParada = "tres fallos seguidos.";
        break;
      }
    }
  }

  const cierre = [
    "✅ *Difusión terminada*",
    "",
    `> Enviados: *${enviados}*`,
    `> Omitidos: *${omitidos.length}*`,
  ];
  if (motivoParada) {
    cierre.push("", `⚠️ *Se paró:* ${motivoParada}`, "> No insistas hoy: si la cuenta quedó limitada, más envíos la empeoran.");
  }
  await enviartexto(cierre.join("\n"));
}
