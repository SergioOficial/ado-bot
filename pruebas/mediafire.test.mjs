/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { esDeMediafire } from "../plugins/descargas/mf.js";

const destino = (href) => new URL(href);
const rechaza = (href) => igual(esDeMediafire(destino(href)), false, href);

export const pruebas = [
  ["acepta mediafire.com y sus subdominios", () => {
    for (const href of [
      "https://www.mediafire.com/file/abc/file.zip/file",
      "https://mediafire.com/file/abc/file.zip",
      "https://download2391.mediafire.com/xyz/file.zip",
    ]) {
      esVerdad(esDeMediafire(destino(href)), href);
    }
  }],

  ["no se deja engañar por el texto del enlace (el truco del @)", () => {
    // `url.includes('mediafire.com')` daba esto por bueno.
    rechaza("http://mediafire.com@127.0.0.1/");
    rechaza("http://127.0.0.1/?mediafire.com");
    rechaza("https://mediafire.com.evil.test/file");
  }],

  ["no acepta el nombre pegado a otro dominio", () => {
    rechaza("https://notmediafire.com/file");
    rechaza("https://mediafire.company/file");
  }],

  ["no acepta otros esquemas ni IPs sueltas", () => {
    rechaza("ftp://mediafire.com/file");
    rechaza("https://169.254.169.254/latest/meta-data/");
  }],
];

// ── el otro que bajaba de fuera: Aptoide ──────────────────────────────
import { esDeAptoide } from "../plugins/descargas/apk.js";

pruebas.push(
  ["Aptoide: sólo su host y sólo https", () => {
    esVerdad(esDeAptoide(new URL("https://pool.apk.aptoide.com/bbwelcome/com-whatsapp.apk")), "pool");
    esVerdad(esDeAptoide(new URL("https://ws75.aptoide.com/api/7/apps/search")), "api");
    igual(esDeAptoide(new URL("http://pool.apk.aptoide.com/x.apk")), false, "http no");
    igual(esDeAptoide(new URL("https://aptoide.com.evil.test/x.apk")), false, "dominio falso");
    igual(esDeAptoide(new URL("https://169.254.169.254/latest/meta-data/")), false, "metadatos");
  }]
);
