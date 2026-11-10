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
 * adivinando. Este comando manda cuatro mensajes, uno por tipo, numerados: el
 * que aparezca como «no compatible» es el culpable. No adivina: mide.
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
      await sock.sendMessage(from, { text: "「PRUEBA 1/4」 texto plano" }, { quoted: m });
      anotar(1, "texto plano", true);
    } catch (e) {
      anotar(1, "texto plano", false, e.message);
    }

    // 2. Tarjeta con botones sencillos, sin adornos.
    try {
      const r = await enviarConBotones(sock, from, {
        texto: "「PRUEBA 2/4」 tarjeta con botones",
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
        texto: "「PRUEBA 3/4」 tarjeta con hoja inferior",
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
          { image: PIXEL, caption: "「PRUEBA 4/4」 álbum" },
          { image: PIXEL, caption: "segunda imagen del álbum" },
        ],
        { quoted: m }
      );
      anotar(4, "álbum", r.sent, r.sent ? null : r.error?.message);
    } catch (e) {
      anotar(4, "álbum", false, e.message);
    }

    const lineas = resultados.map((r) => {
      const marca = r.ok ? "✅" : "❌";
      const extra = !r.ok && r.detalle ? ` (${r.detalle})` : "";
      return `${marca} ${r.n}. ${r.tipo}${extra}`;
    });

    return enviartexto(
      `「✧」 *Resultado del envío*\n\n${lineas.join("\n")}\n\n` +
        `*Lo que buscamos*\n` +
        `> Mira los cuatro mensajes de arriba. El que salga como\n` +
        `> «no compatible con tu versión» es el que tu WhatsApp no lee,\n` +
        `> aunque aquí haya salido ✅ (enviar y poder leerlo son cosas distintas).\n\n` +
        `*Qué significa cada número*\n` +
        `> 1 → texto: si falla, no es el cliente.\n` +
        `> 2 → botones: native_flow.\n` +
        `> 3 → hoja inferior: messageParamsJson.\n` +
        `> 4 → álbum: albumMessage.\n\n` +
        `> Si solo falló uno, dime el número y lo arreglo en esa vía.`
    );
  },
};
