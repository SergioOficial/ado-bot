/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * utils/traducir.js — traducir texto sin instalar media dependencia.
 *
 * Antes importaba `@vitalets/google-translate-api`, que no estaba en el
 * package.json: el comando fallaba en cualquier instalación limpia y el humo lo
 * cazó. Se habla con el mismo endpoint público que usaba la librería, con
 * plazo, tope de texto y mensajes distintos por caso.
 */

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MAX_TEXTO = 4000;
const PLAZO_MS = 15_000;

/** ¿Es un idioma con pinta de idioma? (`es`, `en`, `pt`, `zh-CN`…) */
function idiomaValido(codigo) {
  return /^[a-z]{2}(-[A-Za-z]{2})?$/.test(String(codigo || ""));
}

async function traducir(texto, destino) {
  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(destino)}&dt=t&q=${encodeURIComponent(texto)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(PLAZO_MS),
    headers: { "user-agent": "Levi-Bot (+https://github.com/SergioOficial/ado-bot)" },
  });
  if (!res.ok) throw new Error(`el traductor respondió ${res.status}`);
  const datos = await res.json();
  const partes = (datos?.[0] || []).map((trozo) => trozo?.[0] || "").join("").trim();
  if (!partes) throw new Error("el traductor no devolvió texto");
  return { texto: partes, origen: datos?.[2] || "auto" };
}

export default {
  command: ['translate', 'trad', 'traducir'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;

    if (!args[0]) return enviartexto('《✧》 Ingresa el idioma seguido del texto. Ejemplo: *.trad en hola mundo*');

    let lang = args[0];
    let text = args.slice(1).join(' ');

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!text && quoted) text = quoted.conversation || quoted.extendedTextMessage?.text;

    if (!idiomaValido(lang)) {
      lang = 'es';
      text = args.join(' ') || (quoted ? (quoted.conversation || quoted.extendedTextMessage?.text) : null);
    }

    if (!text) return enviartexto('《✧》 No hay texto para traducir.');
    if (text.length > MAX_TEXTO) {
      return enviartexto(`《✧》 El texto pasa de ${MAX_TEXTO} caracteres; mándalo más corto.`);
    }

    try {
      await sock.sendMessage(from, { react: { text: '🕒', key: m.key } });
      const { texto, origen } = await traducir(text, lang);
      await sock.sendMessage(from, { text: `${texto}\n\n> ${origen} → ${lang}`, quoted: m });
      await sock.sendMessage(from, { react: { text: '✔️', key: m.key } });
    } catch (e) {
      await sock.sendMessage(from, { react: { text: '✖️', key: m.key } });
      await enviartexto(`《✧》 No pude traducir: ${e.message}`);
    }
  }
};
