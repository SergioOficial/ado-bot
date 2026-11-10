/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .qr <texto> — dibuja el código QR aquí dentro.
 *
 * Antes se pedía a api.qrserver.com: sin internet para ese dominio, o con el
 * servicio caído, el comando no daba ni QR ni un error útil (mandaba una imagen
 * rota). Ahora se calcula con `qr` y se pinta con `sharp`, así que funciona
 * sin red. 4 módulos de zona de silencio, que es lo que necesitan los lectores.
 */
import encodeQR from "qr";
import sharp from "sharp";

const MAX_CARACTERES = 1200; // más que esto y WhatsApp reescala hasta que no se lee
const ESCALA = 12;
const SILENCIO = 4; // en módulos (el mínimo de la norma)

export default {
  command: ["qr", "qrcode", "qrgen", "makeqr"],
  execute: async (ctx) => {
    const { sock, from, m, enviartexto, PREFIX } = ctx;
    const texto = (ctx.args || []).join(" ").trim();

    if (!texto) {
      return enviartexto(
        `📱 *Código QR*\n\n> Uso: *${PREFIX}qr <texto o enlace>*\n> Ejemplo: ${PREFIX}qr https://github.com/riokuroxi-svg/Shin-MD`
      );
    }
    if (texto.length > MAX_CARACTERES) {
      return enviartexto(
        `《✧》 Son *${texto.length}* caracteres y el máximo son *${MAX_CARACTERES}*.\n> Con más, WhatsApp encoge la imagen y ningún lector lo abre.`
      );
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } }).catch(() => {});

    try {
      // `qr` ya añade el silencio con border; raw devuelve la matriz de módulos.
      const filas = encodeQR(texto, "raw", { border: SILENCIO });
      const n = filas.length;
      const lado = n * ESCALA;

      // Bitmap de 1 canal: 255 blanco, 0 negro. Pasar la matriz a `sharp` tal
      // cual no sirve: espera píxeles, no módulos.
      const pixeles = Buffer.alloc(lado * lado, 255);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (!filas[y][x]) continue;
          const x0 = x * ESCALA;
          for (let dy = 0; dy < ESCALA; dy++) {
            const inicio = (y * ESCALA + dy) * lado + x0;
            pixeles.fill(0, inicio, inicio + ESCALA);
          }
        }
      }

      const png = await sharp(pixeles, { raw: { width: lado, height: lado, channels: 1 } })
        .png()
        .toBuffer();

      await sock.sendMessage(
        from,
        {
          image: png,
          caption: `📱 *Código QR generado*\n\n> *Contenido:* ${texto.slice(0, 300)}${texto.length > 300 ? "…" : ""}`,
        },
        { quoted: m }
      );
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } }).catch(() => {});
    } catch (err) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
      await enviartexto(`❌ No pude dibujar el QR.\n_${err.message}_`);
    }
  },
};
