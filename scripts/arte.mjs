/**
 * Las imágenes del README, dibujadas aquí dentro.
 *
 * Portada, tarjetas de cifras, insignias y divisores: todo son SVG generados
 * con los números de verdad (versión, comandos, pruebas, categorías), así que
 * `npm run readme` los pone al día a la vez que el texto. No se pide nada a
 * ningún servicio externo, así que el README se ve igual dentro de diez años.
 *
 * Cada pieza sale en dos versiones, oscura y clara, y el README elige con
 * `<picture>` + `prefers-color-scheme`, que es lo que GitHub entiende. Las
 * animaciones van en CSS dentro del propio SVG (GitHub no deja scripts, pero
 * sí animaciones) y se apagan solas con `prefers-reduced-motion`.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUENTE = join(RAIZ, "docs/assets/fuente");

export const PALETA = {
  oscura: {
    fondos: ["#0C0817", "#150C26", "#1F1140"],
    tinta: "#F6F1FF",
    tenue: "#B6A5D6",
    linea: "#2E2149",
    tarjeta: "#170F2A",
    borde: "#332455",
    haloA: "#8A2BE2",
    haloB: "#3E6FD9",
    brillo: "#FFFFFF",
    acentos: { pruebas: "#4ADE9E", comandos: "#B69CFF", categorias: "#F472B6", version: "#7CC4FF" },
  },
  clara: {
    fondos: ["#FCFAFF", "#F6EFFC", "#EDE4F9"],
    tinta: "#1B1030",
    tenue: "#6E5C8C",
    linea: "#E7DCF6",
    tarjeta: "#FFFFFF",
    borde: "#E4D7F5",
    haloA: "#B98BF0",
    haloB: "#7FA8F5",
    brillo: "#FFFFFF",
    acentos: { pruebas: "#0F9D74", comandos: "#7C3AED", categorias: "#DB2777", version: "#2563EB" },
  },
};

// ── Piezas de dibujo ────────────────────────────────────────────────────────

/** La pila de fuentes va escrita: dentro de un <img>, «inherit» acaba en Times. */
const TIPO = '-apple-system, BlinkMacSystemFont, &quot;SF Pro Display&quot;, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, sans-serif';
const TIPO_MONO = 'ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, monospace';

const esc = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Ancho aproximado de un texto, para que nada se salga de su caja.
 * No hace falta exactitud: son márgenes de seguridad, no maquetación.
 */
function ancho(texto, tam, { negrita = false } = {}) {
  let em = 0;
  for (const c of String(texto)) {
    if (" .,:;'`|!iíjl".includes(c)) em += 0.3;
    else if ("frt()[]-".includes(c)) em += 0.42;
    else if (c >= "A" && c <= "Z") em += 0.68;
    else if (c >= "0" && c <= "9") em += 0.58;
    else if (/[ÁÉÍÓÚÑÜ]/.test(c)) em += 0.72;
    else em += 0.55;
  }
  return em * tam * (negrita ? 1.05 : 1);
}

const dataURI = (archivo, tipo = "image/jpeg") =>
  `data:${tipo};base64,${readFileSync(join(FUENTE, archivo)).toString("base64")}`;

const cabecera = (ancho_, alto, etiqueta) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${ancho_} ${alto}" width="${ancho_}" height="${alto}" role="img" aria-label="${esc(etiqueta)}">`;

/** Las animaciones, todas dentro del archivo. */
const animaciones = `
@keyframes vaiven { 0% { transform: translateX(-620px) } 100% { transform: translateX(1500px) } }
@keyframes respirar { 0%,100% { opacity: .45 } 50% { opacity: .8 } }
@keyframes latir { 0%,100% { opacity: .25; transform: scale(1) } 50% { opacity: .7; transform: scale(1.35) } }
@keyframes recorrer { 0% { transform: translateX(-320px) } 100% { transform: translateX(1240px) } }
.brillo { animation: vaiven 11s linear infinite; }
.halo { animation: respirar 9s ease-in-out infinite; }
.punto { animation: latir 5s ease-in-out infinite; transform-origin: center; }
.destello { animation: recorrer 7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .brillo, .halo, .punto, .destello { animation: none }
}`;

function defs(P, { fondo = true } = {}) {
  const [a, b, c] = P.fondos;
  return `<defs>
<style>${animaciones}</style>
${fondo ? `<linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
<radialGradient id="haloA" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${P.haloA}" stop-opacity=".34"/><stop offset="1" stop-color="${P.haloA}" stop-opacity="0"/></radialGradient>
<radialGradient id="haloB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${P.haloB}" stop-opacity=".3"/><stop offset="1" stop-color="${P.haloB}" stop-opacity="0"/></radialGradient>
<linearGradient id="tinta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.tinta}"/><stop offset="1" stop-color="${P.acentos.comandos}"/></linearGradient>
<linearGradient id="lineaFina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.linea}" stop-opacity="0"/><stop offset=".5" stop-color="${P.linea}"/><stop offset="1" stop-color="${P.linea}" stop-opacity="0"/></linearGradient>
<linearGradient id="velo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.brillo}" stop-opacity="0"/><stop offset=".5" stop-color="${P.brillo}" stop-opacity=".1"/><stop offset="1" stop-color="${P.brillo}" stop-opacity="0"/></linearGradient>
<pattern id="trama" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r="1.6" fill="${P.tenue}" opacity=".3"/></pattern>` : `<linearGradient id="lineaFina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.linea}" stop-opacity="0"/><stop offset=".5" stop-color="${P.linea}"/><stop offset="1" stop-color="${P.linea}" stop-opacity="0"/></linearGradient>`}
</defs>`;
}

const ICONOS = {
  check: `<path d="M4.5 12.5 9.5 17.5 19.5 6.8" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  terminal: `<path d="M4.5 6.2 11 12l-6.5 5.8" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.4 18h6" fill="none" stroke-width="2.4" stroke-linecap="round"/>`,
  escudo: `<path d="M12 3 19.2 6v6.1c0 4.8-3.4 7.9-7.2 9-3.8-1.1-7.2-4.2-7.2-9V6z" fill="none" stroke-width="2.1" stroke-linejoin="round"/><path d="M8.8 12.2 11.4 15l4-5" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  hexagono: `<path d="M12 2.6 20.4 7.4v9.2L12 21.4 3.6 16.6V7.4z" fill="none" stroke-width="2.1" stroke-linejoin="round"/><path d="M9.3 15.3V9l5.4 6.3V9" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`,
};
export const ICONO = ICONOS;

// ── Portada ─────────────────────────────────────────────────────────────────

export function portada(datos, tema = "oscura") {
  const P = PALETA[tema];
  const W = 1160;
  const H = 336;
  const arte = dataURI("arte.jpg");
  const logo = dataURI("logo.jpg");

  // Textos de la izquierda
  const titulo = "Ado-Bot";
  const reclamo = "El bot de WhatsApp modular, sin cajas negras.";
  const apoyo = "Se conecta con Baileys, arranca con un código de vinculación";
  const apoyo2 = "y cada comando es un archivo que puedes leer, cambiar o borrar.";
  const chips = ["Node 20.9+", "AGPL-3.0", "Baileys", `${datos.categorias} categorías`];

  let x = 66;
  const chipSvg = chips
    .map((texto) => {
      const w = ancho(texto, 15) + 34;
      const y = H - 74;
      const pieza =
        `<g><rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="38" rx="19" fill="${P.tarjeta}" stroke="${P.borde}" stroke-width="1.2"/>` +
        `<circle cx="${(x + 17).toFixed(1)}" cy="${y + 19}" r="3.6" fill="${P.acentos.comandos}"/>` +
        `<text x="${(x + 28).toFixed(1)}" y="${y + 24}" font-family="${TIPO}" font-size="15" font-weight="600" fill="${P.tenue}">${esc(texto)}</text></g>`;
      x += w + 12;
      return pieza;
    })
    .join("");

  return `${cabecera(W, H, `Ado-Bot ${datos.version} — ${reclamo}`)}
${defs(P)}
<rect width="${W}" height="${H}" fill="url(#fondo)"/>
<ellipse class="halo" cx="905" cy="70" rx="360" ry="190" fill="url(#haloA)"/>
<ellipse class="halo" cx="620" cy="${H - 10}" rx="300" ry="150" fill="url(#haloB)"/>
<rect x="${W - 430}" y="0" width="430" height="${H}" fill="url(#trama)" opacity=".55"/>
<g clip-path="inset(0)"><rect class="brillo" x="0" y="-40" width="300" height="${H + 80}" fill="url(#velo)" transform="skewX(-18)"/></g>
<rect x="0" y="0" width="${W}" height="1.4" fill="url(#lineaFina)"/>

<g>
  <clipPath id="aro"><circle cx="102" cy="104" r="35"/></clipPath>
  <circle cx="102" cy="104" r="41" fill="${P.acentos.comandos}" opacity=".13"/>
  <image x="67" y="69" width="70" height="70" clip-path="url(#aro)" preserveAspectRatio="xMidYMid slice" xlink:href="${logo}"/>
  <circle cx="102" cy="104" r="35" fill="none" stroke="${P.acentos.comandos}" stroke-width="1.7" opacity=".75"/>
</g>

<text x="${150}" y="100" font-family="${TIPO}" font-size="52" font-weight="800" letter-spacing="-1.2" fill="url(#tinta)">${esc(titulo)}</text>
<rect x="${(150 + ancho(titulo, 52, { negrita: true }) + 30).toFixed(1)}" y="60" width="${(ancho(datos.version, 16) + 30).toFixed(1)}" height="30" rx="15" fill="${P.tarjeta}" stroke="${P.acentos.comandos}" stroke-width="1.2"/>
<text x="${(150 + ancho(titulo, 52, { negrita: true }) + 45).toFixed(1)}" y="80" font-family="${TIPO}" font-size="16" font-weight="700" fill="${P.acentos.comandos}">v${esc(datos.version)}</text>

<text x="150" y="146" font-family="${TIPO}" font-size="22" font-weight="600" fill="${P.tinta}" opacity=".95">${esc(reclamo)}</text>
<text x="150" y="${H - 128}" font-family="${TIPO}" font-size="16.5" fill="${P.tenue}">${esc(apoyo)}</text>
<text x="150" y="${H - 105}" font-family="${TIPO}" font-size="16.5" fill="${P.tenue}">${esc(apoyo2)}</text>
${chipSvg}

<g>
  <rect x="884" y="46" width="212" height="212" rx="28" fill="${P.haloA}" opacity=".22"/>
  <clipPath id="marco"><rect x="884" y="46" width="212" height="212" rx="28"/></clipPath>
  <image x="884" y="46" width="212" height="212" clip-path="url(#marco)" preserveAspectRatio="xMidYMid slice" xlink:href="${arte}"/>
  <rect x="884" y="46" width="212" height="212" rx="28" fill="none" stroke="${P.haloA}" stroke-width="1.6" opacity=".55"/>
  <circle class="punto" cx="${W - 40}" cy="34" r="4" fill="${P.acentos.categorias}"/>
</g>
</svg>`;
}

// ── Tarjetas de cifras ──────────────────────────────────────────────────────

export function cifras(datos, tema = "oscura") {
  const P = PALETA[tema];
  const W = 1160;
  const H = 150;
  const alto = 110;
  const anchoCaja = 257;
  const separacion = 25;

  const cajas = [
    { clave: "pruebas", etiqueta: "PRUEBAS", valor: datos.pruebas ? `${datos.pruebas}/${datos.pruebas}` : "—", nota: "en verde" },
    { clave: "comandos", etiqueta: "COMANDOS", valor: String(datos.nombres), nota: `nombres en ${datos.plugins} archivos` },
    { clave: "categorias", etiqueta: "CATEGORÍAS", valor: String(datos.categorias), nota: "cada una, con su comando" },
    { clave: "version", etiqueta: "VERSIÓN", valor: datos.version, nota: `base Shin-MD ${datos.version}` },
  ];

  const dibujo = cajas
    .map((c, i) => {
      const x = 29 + i * (anchoCaja + separacion);
      const acento = P.acentos[c.clave];
      const y = 20;
      return `<g>
  <rect x="${x}" y="${y}" width="${anchoCaja}" height="${alto}" rx="20" fill="${P.tarjeta}" stroke="${P.borde}" stroke-width="1.2"/>
  <rect x="${x}" y="${y}" width="7" height="${alto}" rx="3.5" fill="${acento}"/>
  <text x="${x + 30}" y="${y + 34}" font-family="${TIPO}" font-size="12.5" font-weight="700" letter-spacing="1.6" fill="${acento}">${c.etiqueta}</text>
  <text x="${x + 29}" y="${y + 74}" font-family="${TIPO}" font-size="31" font-weight="800" fill="${P.tinta}">${esc(c.valor)}</text>
  <text x="${x + 30}" y="${y + 96}" font-family="${TIPO}" font-size="12.5" fill="${P.tenue}">${esc(c.nota)}</text>
</g>`;
    })
    .join("\n");

  return `${cabecera(W, H, `Cifras reales de Ado-Bot: ${datos.pruebas ?? "?"} pruebas, ${datos.nombres} nombres de comando, ${datos.categorias} categorías, versión ${datos.version}`)}
${defs(P)}
<rect width="${W}" height="${H}" fill="url(#fondo)"/>
<ellipse class="halo" cx="180" cy="20" rx="320" ry="120" fill="url(#haloA)"/>
<ellipse class="halo" cx="980" cy="140" rx="320" ry="120" fill="url(#haloB)"/>
${dibujo}
</svg>`;
}

// ── Divisor ─────────────────────────────────────────────────────────────────

export function divisor(tema = "oscura") {
  const P = PALETA[tema];
  const W = 1160;
  const H = 30;
  const c = W / 2;
  return `${cabecera(W, H, "divisor")}
${defs(P, { fondo: false })}
<line x1="0" y1="15" x2="${c - 34}" y2="15" stroke="url(#lineaFina)" stroke-width="1.4"/>
<line x1="${c + 34}" y1="15" x2="${W}" y2="15" stroke="url(#lineaFina)" stroke-width="1.4"/>
<g transform="translate(${c} 15)">
  <circle class="punto" r="3.4" fill="${P.acentos.comandos}"/>
  <rect x="-7" y="-7" width="14" height="14" rx="3" fill="none" stroke="${P.acentos.comandos}" stroke-width="1.4" opacity=".5" transform="rotate(45)"/>
  <circle cx="-22" cy="0" r="2" fill="${P.tenue}" opacity=".5"/>
  <circle cx="22" cy="0" r="2" fill="${P.tenue}" opacity=".5"/>
</g>
</svg>`;
}

// ── Insignias ───────────────────────────────────────────────────────────────

export function insignia({ etiqueta, valor, acento, icono = "check" }, tema = "oscura") {
  const P = PALETA[tema];
  const color = P.acentos[acento] || P.acentos.comandos;
  const H = 50;
  const alto = 50;
  // Se mide en mayúsculas y con el espaciado de letras puesto: si no, la
  // etiqueta se come el número.
  const etiquetaAlta = etiqueta.toUpperCase();
  const anchoEtiqueta = ancho(etiquetaAlta, 14, { negrita: true }) + etiquetaAlta.length * 1.15;
  const anchoValor = ancho(valor, 19, { negrita: true }) * 1.06;
  const W = 20 + 30 + 11 + anchoEtiqueta + 9 + anchoValor + 30;
  const xTex = 61;
  return `${cabecera(W, H, `${etiqueta} ${valor}`)}
<defs><style>${animaciones}</style>
<linearGradient id="piel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.tarjeta}"/><stop offset="1" stop-color="${P.borde}" stop-opacity=".55"/></linearGradient>
<clipPath id="recorte"><rect x="0.8" y="0.8" width="${(W - 1.6).toFixed(1)}" height="${(alto - 1.6).toFixed(1)}" rx="15"/></clipPath>
</defs>
<g clip-path="url(#recorte)">
  <rect x="0" y="0" width="${W.toFixed(1)}" height="${alto}" rx="15" fill="url(#piel)" stroke="${P.borde}" stroke-width="1.4"/>
  <rect class="destello" x="0" y="0" width="120" height="${alto}" fill="url(#velo)" opacity=".35"/>
</g>
<circle cx="35" cy="25" r="15" fill="${color}" opacity=".15"/>
<g transform="translate(23 13)" fill="none" stroke="${color}" stroke-width="2">${ICONOS[icono] || ICONOS.check}</g>
<text x="${xTex}" y="31" font-family="${TIPO}" font-size="14" font-weight="700" letter-spacing="1.1" fill="${P.tenue}">${esc(etiquetaAlta)}</text>
<text x="${(xTex + anchoEtiqueta + 9).toFixed(1)}" y="32" font-family="${TIPO}" font-size="19" font-weight="800" fill="${P.tinta}">${esc(valor)}</text>
</svg>`;
}

// ── Todo junto ──────────────────────────────────────────────────────────────

/** Devuelve la lista de archivos a escribir: ruta relativa y contenido. */
export function imagenes(datos) {
  const salida = [];
  for (const tema of ["oscura", "clara"]) {
    salida.push({ ruta: `docs/assets/portada-${tema}.svg`, svg: portada(datos, tema) });
    salida.push({ ruta: `docs/assets/cifras-${tema}.svg`, svg: cifras(datos, tema) });
    salida.push({ ruta: `docs/assets/divisor-${tema}.svg`, svg: divisor(tema) });
    const pildoras = [
      { nombre: "pruebas", etiqueta: "pruebas", valor: datos.pruebas ? `${datos.pruebas}/${datos.pruebas}` : "—", acento: "pruebas", icono: "check" },
      { nombre: "comandos", etiqueta: "comandos", valor: String(datos.nombres), acento: "comandos", icono: "terminal" },
      { nombre: "licencia", etiqueta: "licencia", valor: datos.licencia, acento: "categorias", icono: "escudo" },
      { nombre: "node", etiqueta: "node", valor: datos.node, acento: "version", icono: "hexagono" },
    ];
    for (const p of pildoras) {
      salida.push({ ruta: `docs/assets/insignia-${p.nombre}-${tema}.svg`, svg: insignia(p, tema) });
    }
  }
  return salida;
}
