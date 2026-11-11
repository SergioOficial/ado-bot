/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * descargas/apk.js — buscar y bajar un APK de Aptoide.
 *
 * Antes importaba `aptoide-scraper`, que nunca se declaró en package.json: en
 * una instalación limpia el comando estaba roto y la auditoría de comandos lo
 * cantaba. Se habla con la misma API pública que usaba la librería. El enlace
 * que se manda a WhatsApp se valida antes (host de Aptoide y https): un
 * documento con URL hace que sea el cliente quien descargue, y no se le pasa
 * una URL sin mirar.
 */

import { pedir } from "../../lib/consultas.js";
import { validarURL } from "../../lib/red-segura.js";

const API = "https://ws75.aptoide.com/api/7/apps/search";

/** Los APK viven en pool.apk.aptoide.com y compañía; el host tiene que ser suyo. */
export function esDeAptoide(destino) {
  if (!/^https:$/.test(destino.protocol)) return false;
  const host = destino.hostname.toLowerCase();
  return host === "aptoide.com" || host.endsWith(".aptoide.com");
}

const peso = (bytes) => {
  const n = Number(bytes || 0);
  if (!n) return "?";
  return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
};

export default {
  command: ['apk', 'aptoide', 'apkdl'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    if (!args[0]) return enviartexto('《✧》 Por favor, ingresa el nombre de la aplicación.');

    try {
      const consulta = encodeURIComponent(args.join(' ').trim());
      const datos = await pedir(`${API}?query=${consulta}&limit=5`);
      const lista = datos?.datalist?.list || [];
      if (!lista.length) throw new Error('No se encontraron resultados.');

      // Se prefiere una app con firma de confianza; si no hay, la primera.
      const app = lista.find((a) => a?.file?.malware?.rank === 'TRUSTED') || lista[0];
      const enlace = app?.file?.path || app?.file?.path_alt;
      if (!enlace) throw new Error('Aptoide no dio un enlace de descarga para esa app.');

      const destino = await validarURL(enlace);
      if (!esDeAptoide(destino)) throw new Error(`el enlace apunta a ${destino.hostname}, que no es Aptoide.`);

      const confianza = app?.file?.malware?.rank || 'UNKNOWN';
      const caption = `✰ ᩧ　𓈒　ׄ　Aptoide 　ׅ　✿\n\n` +
        `➩ *Nombre ›* ${app.name}\n` +
        `❖ *Paquete ›* ${app.package}\n` +
        `✿ *Versión ›* ${app.file?.vername || '?'}\n` +
        `☆ *Tamaño ›* ${peso(app.file?.filesize || app.size)}\n` +
        `⚑ *Confianza ›* ${confianza === 'TRUSTED' ? 'verificada' : confianza.toLowerCase()}`;

      await sock.sendMessage(from, {
        document: { url: destino.href },
        mimetype: 'application/vnd.android.package-archive',
        fileName: `${String(app.name || 'app').replace(/[^\w.-]+/g, '_')}.apk`,
        caption
      }, { quoted: m });

    } catch (e) {
      await enviartexto(`《✧》 ${e.message}`);
    }
  }
};
