import path from 'path';
import { lookup } from 'mime-types';
import * as cheerio from 'cheerio';
import { pedirSeguro, validarURL } from '../../lib/red-segura.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 64 MB: por debajo del tope de documento de WhatsApp y del plazo del bot. */
const MAX_ARCHIVO = 64 * 1024 * 1024;

/**
 * ¿La URL es de Mediafire de verdad? `url.includes('mediafire.com')` no vale:
 * `http://mediafire.com@127.0.0.1/` lo cumple y apunta a la máquina del bot.
 * Se mira el hostname ya resuelto por `validarURL`, no el texto.
 */
export function esDeMediafire(destino) {
  if (!/^https?:$/.test(destino.protocol)) return false;
  const host = destino.hostname.toLowerCase();
  return host === 'mediafire.com' || host.endsWith('.mediafire.com');
}

/**
 * Descarga con tope y sin abrir la puerta de casa, siguiendo como mucho dos
 * redirecciones y validando CADA salto (el truco clásico es un 302 desde un
 * dominio legítimo hacia 127.0.0.1).
 */
async function descargarDeMediafire(enlace) {
  let actual = enlace;
  for (let salto = 0; salto < 3; salto++) {
    const destino = await validarURL(actual);
    if (!esDeMediafire(destino)) {
      throw new Error(`la descarga apunta a ${destino.hostname}, que no es Mediafire.`);
    }
    const res = await fetch(destino, {
      redirect: 'manual',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(120_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const siguiente = res.headers.get('location');
      if (!siguiente) throw new Error('Mediafire redirigió a ninguna parte.');
      actual = new URL(siguiente, destino).href;
      continue;
    }
    if (!res.ok) throw new Error(`Mediafire respondió ${res.status}.`);

    const largo = Number(res.headers.get('content-length') || 0);
    if (largo > MAX_ARCHIVO) {
      throw new Error(`el archivo pesa ${(largo / 1048576).toFixed(1)} MB y el máximo son ${MAX_ARCHIVO / 1048576} MB.`);
    }
    const trozos = [];
    let total = 0;
    for await (const trozo of res.body) {
      total += trozo.length;
      if (total > MAX_ARCHIVO) throw new Error('el archivo pasó del tope mientras se descargaba.');
      trozos.push(trozo);
    }
    return { buffer: Buffer.concat(trozos), tipo: res.headers.get('content-type') || '' };
  }
  throw new Error('demasiadas redirecciones; pásame el enlace directo.');
}

export default {
  command: ['mediafire', 'mf'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    const url = (args[0] || '').trim();

    if (!url) return enviartexto('《✧》 Por favor, ingresa un enlace de Mediafire.');

    try {
      // 1. La página: se valida el host antes de pedirla y se lee con tope.
      const destino = await validarURL(url);
      if (!esDeMediafire(destino)) {
        return enviartexto('《✧》 Ese enlace no es de Mediafire.');
      }
      const { buffer: html } = await pedirSeguro(url, { max: 2 * 1024 * 1024 });
      const $ = cheerio.load(html.toString('utf8'));

      const downloadLink = $('#downloadButton').attr('href');
      if (!downloadLink) throw new Error('Enlace de descarga no encontrado.');

      const filename = $('.intro .filename').text().trim() || 'archivo.zip';
      const ext = path.extname(filename);
      const tipo = lookup(ext) || 'application/octet-stream';

      // 2. El archivo: mismo filtro, con tope de 64 MB.
      const { buffer: archivo, tipo: tipoReal } = await descargarDeMediafire(new URL(downloadLink, destino).href);

      const info = `✰ ᩧ　𓈒　ׄ　𝖬𝖾𝖽𝗂𝖺𝖥𝗂𝗋𝖾　ׅ　✿\n\nׄ ﹙ׅ✿﹚ּ *Nombre* › ${filename}\nׄ ﹙ׅ✿﹚ּ *Tipo* › ${tipo}\nׄ ﹙ׅ✿﹚ּ *Peso* › ${(archivo.length / 1048576).toFixed(2)} MB`;

      await sock.sendMessage(from, { text: info }, { quoted: m });
      // Se manda el buffer ya descargado: si se pasara la URL, quien la sirve
      // podría cambiarla después por cualquier otra cosa.
      await sock.sendMessage(from, { document: archivo, mimetype: tipoReal || tipo, fileName: filename }, { quoted: m });

    } catch (e) {
      await enviartexto(`《✧》 ${e.message}`);
    }
  }
};
