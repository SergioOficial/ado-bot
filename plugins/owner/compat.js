/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .compat / .diagnostico — ¿cuál de mis mensajes no sabe leer tu WhatsApp?
 *
 * Cuando un cliente no entiende un tipo de mensaje, WhatsApp no da error: lo
 * cambia por «Recibiste un mensaje que no es compatible con tu versión». Del
 * lado del bot todo salió bien, así que el registro no dice nada y uno se queda
 * adivinando. Este comando manda siete mensajes, uno por tipo, numerados: el
 * que aparezca como «no compatible» es el culpable. No adivina: mide.
 *
 * Las tres últimas pruebas son las que de verdad distinguen la causa:
 *   · la 5 manda los botones en formato clásico (`buttonsMessage`);
 *   · la 6 manda la lista en el formato legado (`listMessage`);
 *   · la 7 repite la tarjeta moderna pero citando el mensaje.
 * Si la 2 sale mal y la 5 bien, el culpable es el formato moderno. Si la 2 sale
 * bien y la 7 mal, el culpable es la cita.
 *
 * Solo en privado y solo el dueño (llenar un grupo de pruebas no es plan).
 */
import { enviarConBotones, rapido } from "../../lib/botones.js";
import { sendAlbum } from "../../lib/album.js";

// Un PNG de 1×1 transparente: las pruebas de imagen y álbum no dependen de
// ninguna web, así que si la red falla el diagnóstico sigue sirviendo.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export default {
  command: ["compat", "diagnostico", "diagnóstico"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, from, m, enviartexto } = ctx;

    if (!from.endsWith("@s.whatsapp.net") && !from.endsWith("@lid")) {
      return enviartexto(
        "「✧」 Esto va por privado.\n> Escríbeme *`.compat`* en un chat contigo para no llenar el grupo de pruebas."
      );
    }

    const resultados = [];
    const anotar = (n, tipo, ok, detalle) => resultados.push({ n, tipo, ok, detalle });

    // 1. Texto plano. Si esto tampoco se ve, el problema no es el cliente.
    try {
      await sock.sendMessage(from, { text: "「PRUEBA 1/7」 texto plano" }, { quoted: m });
      anotar(1, "texto plano", true);
    } catch (e) {
      anotar(1, "texto plano", false, e.message);
    }

    // 2. Tarjeta con botones sencillos, sin adornos.
    try {
      const r = await enviarConBotones(sock, from, {
        texto: "「PRUEBA 2/7」 tarjeta con botones",
        pie: "si esto sale raro, el culpable es native_flow",
        botones: [rapido("Botón A", "compat_a"), rapido("Botón B", "compat_b")],
        cita: m,
      });
      anotar(2, "tarjeta con botones", Boolean(r), r ? null : "no se envió");
    } catch (e) {
      anotar(2, "tarjeta con botones", false, e.message);
    }

    // 3. La misma tarjeta pidiendo la hoja inferior (messageParamsJson).
    try {
      const r = await enviarConBotones(sock, from, {
        texto: "「PRUEBA 3/7」 tarjeta con hoja inferior",
        pie: "si SOLO falla esta, el culpable es bottom_sheet",
        botones: [rapido("Ver todo", "compat_c"), rapido("Botón D", "compat_d"), rapido("Botón E", "compat_e"), rapido("Botón F", "compat_f")],
        hoja: { titulo: "Prueba 3", divisiones: [1] },
        cita: m,
      });
      anotar(3, "hoja inferior", Boolean(r), r ? null : "no se envió");
    } catch (e) {
      anotar(3, "hoja inferior", false, e.message);
    }

    // 4. Álbum: dos imágenes en una sola tarjeta.
    try {
      const r = await sendAlbum(
        sock,
        from,
        [
          { image: PIXEL, caption: "「PRUEBA 4/7」 álbum" },
          { image: PIXEL, caption: "segunda imagen del álbum" },
        ],
        { quoted: m }
      );
      anotar(4, "álbum", r.sent, r.sent ? null : r.error?.message);
    } catch (e) {
      anotar(4, "álbum", false, e.message);
    }

    // 5. Los mismos botones, en el formato clásico (buttonsMessage). Lo pinta
    //    cualquier cliente; la respuesta llega como texto normal.
    try {
      await sock.sendMessage(
        from,
        {
          text: "「PRUEBA 5/7」 botones clásicos",
          footer: "si esta sale bien y la 2 mal, el culpable es el formato moderno",
          buttons: [
            { text: "Botón clásico A", id: "compat_clasico_a" },
            { text: "Botón clásico B", id: "compat_clasico_b" },
          ],
        },
        { quoted: m }
      );
      anotar(5, "botones clásicos", true);
    } catch (e) {
      anotar(5, "botones clásicos", false, e.message);
    }

    // 6. La lista desplegable en el formato legado (listMessage).
    try {
      await sock.sendMessage(
        from,
        {
          text: "「PRUEBA 6/7」 lista legada",
          title: "Prueba 6",
          buttonText: "Ver opciones",
          footer: "si SOLO falla esta, el culpable es single_select",
          sections: [
            { title: "Prueba", rows: [{ id: "compat_lista", title: "Opción de la lista" }] },
          ],
        },
        { quoted: m }
      );
      anotar(6, "lista legada", true);
    } catch (e) {
      anotar(6, "lista legada", false, e.message);
    }

    // 7. La tarjeta moderna otra vez, pero citando el mensaje. En la captura
    //    del dueño el mismo menú salía bien dos veces y mal la tercera, y las
    //    malas iban citando: esto lo mide.
    try {
      const r = await enviarConBotones(sock, from, {
        texto: "「PRUEBA 7/7」 tarjeta citando el mensaje",
        pie: "si SOLO falla esta, el culpable es la cita",
        botones: [rapido("Botón G", "compat_g"), rapido("Botón H", "compat_h")],
        cita: m,
      });
      anotar(7, "tarjeta con cita", Boolean(r), r ? null : "no se envió");
    } catch (e) {
      anotar(7, "tarjeta con cita", false, e.message);
    }

    const lineas = resultados.map((r) => {
      const marca = r.ok ? "✅" : "❌";
      const extra = !r.ok && r.detalle ? ` (${r.detalle})` : "";
      return `${marca} ${r.n}. ${r.tipo}${extra}`;
    });

    return enviartexto(
      `「✧」 *Resultado del envío*\n\n${lineas.join("\n")}\n\n` +
        `*Lo que buscamos*\n` +
        `> Mira los siete mensajes de arriba. El que salga como\n` +
        `> «no compatible con tu versión» es el que tu WhatsApp no lee,\n` +
        `> aunque aquí haya salido ✅ (enviar y poder leerlo son cosas distintas).\n\n` +
        `*Qué significa cada número*\n` +
        `> 1 → texto: si falla, no es el cliente.\n` +
        `> 2 → botones: native_flow (formato moderno).\n` +
        `> 3 → hoja inferior: messageParamsJson.\n` +
        `> 4 → álbum: albumMessage.\n` +
        `> 5 → botones clásicos: buttonsMessage.\n` +
        `> 6 → lista legada: listMessage.\n` +
        `> 7 → la tarjeta citando: si solo falla esta, es la cita.\n\n` +
        `*Cómo se lee*\n` +
        `> 2 mal y 5 bien → cambia con *BOTONES_FORMATO=clasico*.\n` +
        `> 2 mal y 6 bien → el problema es la lista, no los botones.\n` +
        `> 2 bien y 7 mal → el problema es citar; se manda sin cita.\n` +
        `> 2 y 5 mal → no es el formato: es el cliente o el número.`
    );
  },
};
