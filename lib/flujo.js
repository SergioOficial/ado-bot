/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/flujo.js — piezas puras del comando .flow.
 *
 * Aquí no se habla con WhatsApp ni se lee la base de datos: solo se arman
 * textos, botones y parámetros. Por eso se puede probar sin abrir una sesión.
 */

/** Texto del mensaje, tal como se ve al reenviar la tarjeta. */
export const CUERPO = "🎛️ Click aquí para abrir el menú";

/** Encabezado de la tarjeta. */
export const TITULO = "🎛️ Menú";

/** Pie de la tarjeta. */
export const PIE = "Menú interactivo · experimental";

/** Texto que se muestra dentro del.flow publicado. */
export const DESCRIPCION = "Elige una categoría, busca o toca un comando para ver los detalles";

/** Límite de resultados del buscador local. */
export const LIMITE_RESULTADOS = 12;

/**
 * Lee la configuración del Flow desde el entorno.
 *
 * FLOW_ID y FLOW_TOKEN son los que entrega WhatsApp Manager para un Flow
 * publicado. FLOW_NAME es una alternativa al id (no se pueden usar juntos).
 *
 * @param {object} entorno
 * FLOW_WEB_URL es la alternativa sin WABA: enlace HTTPS a un panel web que se
 * abre dentro de WhatsApp con `open_webview`.
 *
 * @returns {{id:string|null, nombre:string|null, token:string, cta:string, pantalla:string, modo:string, datos:object|null, imagen:string|null, web:string|null, listo:boolean}}
 */
export function configuracion(entorno = process.env) {
  const id = String(entorno.FLOW_ID || "").trim();
  const nombre = String(entorno.FLOW_NAME || "").trim();
  const datosCrudos = String(entorno.FLOW_DATOS || "").trim();
  let datos = null;

  if (datosCrudos) {
    try {
      const parseado = JSON.parse(datosCrudos);
      if (parseado && typeof parseado === "object" && !Array.isArray(parseado)) datos = parseado;
    } catch {
      datos = null;
    }
  }

  const ctaOriginal = String(entorno.FLOW_CTA || "Abrir menú").trim() || "Abrir menú";
  // La CTA no admite emoji y Meta recomienda 30 caracteres o menos.
  const cta = Array.from(ctaOriginal)
    .filter((caracter) => !/\p{Extended_Pictographic}|\p{Emoji_Modifier}/u.test(caracter))
    .join("")
    .trim()
    .slice(0, 30) || "Abrir menú";

  return {
    id: id || null,
    nombre: id ? null : nombre || null,
    token: String(entorno.FLOW_TOKEN || "unused").trim() || "unused",
    cta,
    pantalla: String(entorno.FLOW_PANTALLA || "MENU").trim() || "MENU",
    modo: String(entorno.FLOW_MODO || "published").toLowerCase() === "draft" ? "draft" : "published",
    datos,
    imagen: String(entorno.FLOW_IMAGEN || "").trim() || null,
    web: String(entorno.FLOW_WEB_URL || "").trim() || null,
    listo: Boolean(id || nombre),
  };
}

/**
 * Parámetros del botón `galaxy_message` de un Flow publicado.
 * Es el mismo contenido que la API de WhatsApp envía en
 * `interactive.action.parameters`, pero en el formato nativo que usa Baileys.
 *
 * @param {object} conf resultado de configuracion()
 * @returns {string} JSON de los parámetros, listo para lib/botones.js
 */
export function parametrosGalaxy(conf) {
  if (!conf?.listo) throw new Error("Falta FLOW_ID o FLOW_NAME");

  const parameters = {
    mode: conf.modo,
    flow_message_version: "3",
    flow_token: conf.token,
    flow_cta: conf.cta,
    flow_action: "navigate",
    flow_action_payload: {
      screen: conf.pantalla,
    },
  };

  if (conf.id) parameters.flow_id = conf.id;
  else parameters.flow_name = conf.nombre;

  if (conf.datos) parameters.flow_action_payload.data = conf.datos;

  return JSON.stringify(parameters);
}

/**
 * Botones del modo local: imita las categorías visibles en la captura sin
 * necesitar una cuenta business ni un Flow publicado.
 *
 * Los ids son comandos reales del bot: la compuerta los convierte en
 * `.flow cat ...` o `.flow buscar ...` cuando se tocan.
 *
 * @param {Array<{titulo:string, emoji?:string}>} categorias
 * @param {number} [visibles]
 */
export function botonesLocales(categorias = [], visibles = 3) {
  const limpias = categorias.filter(Boolean).slice(0, Math.max(0, visibles));
  const botones = limpias.map((c) => ({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: `${c.emoji || "▸"} ${c.titulo}`,
      id: `flow cat ${c.titulo}`,
    }),
  }));

  if (categorias.length > visibles) {
    const filas = categorias.map((c) => ({
      id: `flow cat ${c.titulo}`,
      title: `${c.emoji || "▸"} ${c.titulo}`,
      description: c.descripcion || "",
    }));
    botones.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Categorías",
        sections: [{ title: "Menú interactivo", rows: filas }],
      }),
    });
  }

  botones.push({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: "🔎 Buscar comando",
      id: "flow buscar ",
    }),
  });

  return botones;
}

/** Texto de respaldo: lo que se ve cuando el cliente no pinta tarjetas. */
export function textoLocal(categorias = []) {
  const lineas = categorias.map((c) => `▸ ${c.emoji || "▸"} ${c.titulo} → .flow cat ${c.titulo}`);
  return [
    CUERPO,
    "",
    DESCRIPCION,
    "",
    ...lineas,
    "▸ 🔎 Buscar → .flow buscar <palabra>",
    "",
    "Este menú es una prueba: no sustituye a .menu.",
  ].join("\n");
}

/**
 * Busca comandos en el catálogo ya armado por lib/menu-ayuda.js.
 *
 * @param {Array<{titulo:string, comandos:Array<{nombre:string, alias:string[]}>}>} grupos
 * @param {string} termino
 * @returns {Array<{nombre:string, categoria:string}>}
 */
export function buscar(grupos = [], termino = "") {
  let aguja = String(termino || "").trim().toLowerCase();
  if ([".", "!", "/", "#"].includes(aguja[0])) aguja = aguja.slice(1);
  if (!aguja) return [];

  const encontrados = [];
  for (const grupo of grupos) {
    for (const c of grupo.comandos || []) {
      const nombres = [c.nombre, ...(c.alias || [])].map((n) => String(n).toLowerCase());
      if (nombres.some((n) => n.includes(aguja))) {
        encontrados.push({ nombre: nombres[0], categoria: grupo.titulo || grupo.carpeta || "" });
      }
    }
  }

  const vistos = new Set();
  return encontrados
    .filter((r) => {
      if (vistos.has(r.nombre)) return false;
      vistos.add(r.nombre);
      return true;
    })
    .slice(0, LIMITE_RESULTADOS);
}

/** Texto de una categoría concreta, para los chips del menú local. */
export function textoCategoria(grupo, prefijo = ".") {
  if (!grupo) return "No hay esa categoría en el menú.";
  const p = String(prefijo || ".").trim() || ".";
  const lineas = (grupo.comandos || []).map((c) => `▸ ${p}${c.nombre}`);
  return [`*${grupo.titulo || grupo.carpeta}*`, grupo.descripcion || "", "", ...lineas].filter(Boolean).join("\n");
}

/** Estado de la configuración, sin enseñar el token completo. */
export function textoEstado(conf) {
  const token = conf.token === "unused" ? "unused" : `${conf.token.slice(0, 4)}…`;
  let web = "sin definir";
  if (conf.web) {
    try {
      const url = new URL(conf.web);
      web = url.origin + url.pathname;
    } catch {
      web = "URL no válida";
    }
  }
  return [
    "*Estado de .flow*",
    `> Flow publicado: ${conf.listo ? "sí" : "no"}`,
    `> Panel web: ${web}`,
    `> Identificador: ${conf.id || conf.nombre || "sin definir"}`,
    `> Token: ${token}`,
    `> CTA: ${conf.cta}`,
    `> Pantalla: ${conf.pantalla}`,
    `> Modo: ${conf.modo}`,
    "",
    "Variables: FLOW_ID (o FLOW_NAME), FLOW_TOKEN, FLOW_WEB_URL, FLOW_CTA, FLOW_PANTALLA, FLOW_MODO, FLOW_DATOS, FLOW_IMAGEN.",
  ].join("\n");
}

/**
 * Genera el panel web del menú: un HTML suelto, sin dependencias ni recursos
 * externos, que se puede publicar en GitHub Pages y abrir desde WhatsApp con
 * `open_webview`. La lista de comandos sale del catálogo del bot.
 *
 * @param {Array} grupos catálogo de lib/menu-ayuda.js
 * @param {object} [opciones]
 * @returns {string} documento HTML completo
 */
export function htmlMenu(grupos = [], opciones = {}) {
  const nombre = String(opciones.nombre || "Ado-Bot").trim() || "Ado-Bot";
  const prefijo = String(opciones.prefijo || ".").trim() || ".";
  const imagen = String(opciones.imagen || "").trim();

  const esc = (valor) =>
    String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const datos = grupos.map((g) => ({
    titulo: esc(g.titulo || g.carpeta || "Otros"),
    emoji: esc(g.emoji || "▸"),
    descripcion: esc(g.descripcion || ""),
    comandos: (g.comandos || []).map((c) => ({
      nombre: esc(c.nombre),
      alias: (c.alias || []).map(esc),
    })),
  }));

  // Se mete en <script>: < se escapa para que no pueda cerrar la etiqueta.
  const json = JSON.stringify(datos).replace(/</g, "\\u003c");
  const total = datos.reduce((n, g) => n + g.comandos.length, 0);
  const fondo = imagen ? `background-image:linear-gradient(180deg,rgba(9,15,24,.25),rgba(9,15,24,.9)),url(&quot;${esc(imagen)}&quot;);` : "";

  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(nombre)} · Menú interactivo</title>`,
    "<style>",
    ":root{color-scheme:dark;--fondo:#0b1220;--tarjeta:#131d2c;--borde:#25354a;--texto:#e8eef7;--suave:#91a2b8;--verde:#39d98a}",
    "*{box-sizing:border-box}",
    "body{margin:0;background:var(--fondo);color:var(--texto);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}",
    ".barra{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--borde);font-weight:600}",
    ".barra span{color:var(--verde)}",
    "main{padding:16px;max-width:720px;margin:0 auto}",
    ".hero{border:1px solid var(--borde);border-radius:18px;padding:22px;min-height:210px;background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:flex-end;gap:8px}",
    ".hero .etiqueta{align-self:flex-start;border:1px solid var(--verde);color:var(--verde);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}",
    ".hero h1{margin:0;font-size:28px}",
    ".hero p{margin:0;color:var(--suave)}",
    ".contador{border:1px solid var(--verde);color:var(--verde);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;white-space:nowrap}",
    ".buscar{display:flex;align-items:center;gap:8px;margin:16px 0 12px;padding:10px 14px;background:var(--tarjeta);border:1px solid var(--borde);border-radius:14px}",
    ".buscar input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--texto);font:inherit}",
    ".buscar button{background:none;border:0;color:var(--suave);font-size:20px;cursor:pointer}",
    ".chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:10px}",
    ".chip{flex:0 0 auto;background:var(--tarjeta);color:var(--texto);border:1px solid var(--borde);border-radius:999px;padding:8px 14px;cursor:pointer;white-space:nowrap}",
    ".chip.activo{border-color:var(--verde);color:var(--verde)}",
    ".grupo{margin:18px 0 6px;display:flex;align-items:center;justify-content:space-between}",
    ".grupo h2{font-size:19px;margin:0}",
    ".grupo p{margin:2px 0 0;color:var(--suave);font-size:13px}",
    ".lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}",
    ".comando{background:var(--tarjeta);border:1px solid var(--borde);border-radius:14px;padding:12px 14px;text-align:left;color:var(--texto);font:inherit;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".comando b{color:var(--verde);font-weight:600}",
    ".comando small{display:block;color:var(--suave);margin-top:4px}",
    ".vacio{color:var(--suave);padding:20px 0;text-align:center}",
    "footer{color:var(--suave);text-align:center;font-size:12px;padding:22px 0}",
    "@media(max-width:420px){.hero h1{font-size:24px}.lista{grid-template-columns:1fr}}",
    "</style>",
    "</head>",
    "<body>",
    `<div class="barra"><span>🎛️</span><span>${esc(nombre)} · Menú</span></div>`,
    "<main>",
    `<section class="hero" style="${fondo}">`,
    '<span class="etiqueta">MENÚ INTERACTIVO</span>',
    `<h1>${esc(nombre)}</h1>`,
    `<p>${esc(DESCRIPCION)}</p>`,
    "</section>",
    `<div class="buscar"><input id="q" type="search" placeholder="Buscar comando..." autocomplete="off"><button id="limpiar" aria-label="Limpiar">×</button></div>`,
    '<div class="chips" id="chips"></div>',
    '<div id="resultado"></div>',
    "</main>",
    `<footer>${total} comandos · ${esc(prefijo)} delante de cada uno</footer>`,
    "<script>",
    `const datos=${json};`,
    `const prefijo=${JSON.stringify(prefijo)};`,
    "const q=document.getElementById('q');",
    "const chips=document.getElementById('chips');",
    "const resultado=document.getElementById('resultado');",
    "let activa=null;",
    "function pintarChips(){chips.innerHTML='';const todo=document.createElement('button');todo.className='chip'+(activa===null?' activo':'');todo.textContent='Todos';todo.onclick=()=>{activa=null;pintarChips();pintar()};chips.appendChild(todo);for(const g of datos){const b=document.createElement('button');b.className='chip'+(activa===g.titulo?' activo':'');b.textContent=g.emoji+' '+g.titulo;b.onclick=()=>{activa=g.titulo;pintarChips();pintar()};chips.appendChild(b)}}",
    "function pintar(){const aguja=q.value.trim().toLowerCase();resultado.innerHTML='';let total=0;for(const g of datos){if(activa&&activa!==g.titulo)continue;const filas=g.comandos.filter(c=>(c.nombre+' '+c.alias.join(' ')).toLowerCase().includes(aguja));if(!filas.length)continue;total+=filas.length;const bloque=document.createElement('section');const tit=document.createElement('div');tit.className='grupo';tit.innerHTML='<h2>'+g.emoji+' '+g.titulo+'</h2><p>'+g.descripcion+'</p>';bloque.appendChild(tit);const lista=document.createElement('div');lista.className='lista';for(const c of filas){const boton=document.createElement('button');boton.className='comando';boton.innerHTML='<span><b>'+prefijo+c.nombre+'</b><small>'+(c.alias.length?'alias: '+c.alias.join(', '):'toca para copiar')+'</small></span><span>›</span>';boton.onclick=()=>{navigator.clipboard?.writeText(prefijo+c.nombre);boton.querySelector('small').textContent='copiado: '+prefijo+c.nombre};lista.appendChild(boton)}bloque.appendChild(lista);resultado.appendChild(bloque)}if(!total){const p=document.createElement('p');p.className='vacio';p.textContent='Sin resultados para «'+q.value+'»';resultado.appendChild(p)}}",
    "q.addEventListener('input',pintar);",
    "document.getElementById('limpiar').onclick=()=>{q.value='';pintar();q.focus()};",
    "pintarChips();pintar();",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}
