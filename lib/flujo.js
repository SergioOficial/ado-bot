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
export const DESCRIPCION = "Eligue una categoría, busca o toca un comando para ver los detalles";

/**
 * Panel público mientras no se active GitHub Pages en el repositorio. El
 * visor de HTML de GitHub sirve el archivo con tipo text/html; con Pages,
 * basta con poner FLOW_WEB_URL apuntando a menu-flow.html.
 */
export const WEB_PANEL =
  "https://htmlpreview.github.io/?https://github.com/SergioOficial/ado-bot/blob/main/docs/menu-flow.html";

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
    presentacion: ["full", "tall", "compact"].includes(String(entorno.FLOW_PRESENTACION || "").trim())
      ? String(entorno.FLOW_PRESENTACION).trim()
      : "tall",
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
    `> Presentación: ${conf.presentacion || "tall"}`,
    "",
    "Variables: FLOW_ID (o FLOW_NAME), FLOW_TOKEN, FLOW_WEB_URL, FLOW_CTA, FLOW_PANTALLA, FLOW_MODO, FLOW_DATOS, FLOW_IMAGEN, FLOW_PRESENTACION.",
  ].join("\n");
}

/**
 * Genera el panel web del menú: un HTML suelto, sin dependencias ni recursos
 * externos, que se abre dentro de WhatsApp con un cta_url en webview. La lista
 * de comandos sale del catálogo del bot.
 *
 * @param {Array} grupos catálogo de lib/menu-ayuda.js
 * @param {object} [opciones]
 * @returns {string} documento HTML completo
 */
export function htmlMenu(grupos = [], opciones = {}) {
  const nombre = String(opciones.nombre || "WaBot").trim() || "WaBot";
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

  const json = JSON.stringify(datos).replace(/</g, "\\u003c");
  const total = Number.isFinite(Number(opciones.contador)) && Number(opciones.contador) > 0
    ? Number(opciones.contador)
    : datos.reduce((n, g) => n + g.comandos.length, 0);
  const fondo = imagen ? `background-image:url(&quot;${esc(imagen)}&quot;);` : "";

  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>🎛️ Menú</title>",
    "<style>",
    ":root{color-scheme:dark;--fondo:#080c16;--tarjeta:#111a29;--borde:#26364d;--texto:#edf2fa;--suave:#93a4bb;--verde:#39d98a}",
    "*{box-sizing:border-box}",
    "html,body{margin:0;min-height:100%}",
    "body{background:radial-gradient(900px 500px at 50% -10%,#142641 0,var(--fondo) 65%);color:var(--texto);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}",
    ".wrap{max-width:540px;margin:0 auto;padding:14px 14px 28px}",
    ".hero{position:relative;min-height:310px;border:1px solid #2c4a70;border-radius:20px;overflow:hidden;background-size:cover;background-position:center 35%;box-shadow:0 16px 40px rgba(0,0,0,.45)}",
    ".hero:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,14,28,.22) 0%,rgba(8,14,28,.55) 45%,rgba(8,14,28,.96) 100%)}",
    ".hero .contenido{position:relative;padding:18px;display:flex;flex-direction:column;min-height:310px}",
    ".marca{display:flex;align-items:center;gap:12px}",
    ".logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(145deg,#6ee7ff,#2563eb);display:grid;place-items:center;border:1px solid rgba(255,255,255,.35)}",
    ".logo svg{width:30px;height:30px;stroke:#0b1730;fill:none;stroke-width:1.8}",
    ".nombre{font-size:28px;font-weight:800;letter-spacing:-.5px;line-height:1.05}",
    ".subtitulo{font-size:11px;letter-spacing:3px;color:var(--suave);margin-top:4px;font-weight:600}",
    ".marca .contador{margin-left:auto}",
    ".contador{border:1px solid var(--verde);color:var(--verde);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;background:rgba(57,217,138,.08);white-space:nowrap}",
    ".etiqueta{align-self:flex-start;margin-top:16px;padding:6px 13px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1px;background:linear-gradient(100deg,#2b4c8a,#17324f);border:1px solid #4d78b5;color:#dceaff}",
    ".hero .abajo{margin-top:auto}",
    ".hero h1{margin:10px 0 4px;font-size:30px;font-weight:800}",
    ".hero p{margin:0;color:#d7e2f2;font-size:14px;max-width:92%}",
    ".buscar{display:flex;align-items:center;gap:10px;margin:14px 0 12px;padding:13px 15px;background:var(--tarjeta);border:1px solid var(--borde);border-radius:15px}",
    ".buscar svg{width:18px;height:18px;stroke:var(--suave);fill:none;stroke-width:2;flex:0 0 auto}",
    ".buscar input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--texto);font:inherit}",
    ".buscar input::placeholder{color:#7b8ca4}",
    ".buscar button{background:none;border:0;color:var(--suave);font-size:22px;line-height:1;cursor:pointer}",
    ".chips{display:flex;gap:9px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}",
    ".chips::-webkit-scrollbar{display:none}",
    ".chip{flex:0 0 auto;background:var(--tarjeta);color:var(--suave);border:1px solid var(--borde);border-radius:999px;padding:9px 15px;cursor:pointer;font-weight:600;white-space:nowrap}",
    ".chip.activo{border-color:var(--verde);color:var(--verde);background:rgba(57,217,138,.1)}",
    ".grupo{background:var(--tarjeta);border:1px solid var(--borde);border-radius:18px;padding:14px;margin-bottom:12px}",
    ".cabecera{display:flex;gap:12px;align-items:center;margin-bottom:14px}",
    ".icono{width:52px;height:52px;flex:0 0 auto;border-radius:15px;background:#162538;border:1px solid #29405e;display:grid;place-items:center;font-size:25px}",
    ".cabecera h2{margin:0;font-size:19px}",
    ".cabecera p{margin:3px 0 0;color:var(--suave);font-size:13px}",
    ".cabecera .contador{margin-left:auto}",
    ".barra{height:3px;width:62px;background:var(--verde);border-radius:3px;margin:0 0 12px 2px}",
    ".lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
    ".pildora{display:flex;align-items:center;gap:8px;background:#0f1928;border:1px solid var(--borde);border-radius:13px;padding:12px 13px;color:var(--verde);font-weight:700;text-align:left;cursor:pointer;min-width:0}",
    ".pildora span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".pildora .punto{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:var(--verde);box-shadow:0 0 9px rgba(57,217,138,.6)}",
    ".pildora .flecha{margin-left:auto;color:#6f8199;font-size:18px}",
    ".pildora.copiado{border-color:var(--verde)}",
    ".vacio{color:var(--suave);text-align:center;padding:28px 0}",
    "footer{text-align:center;color:#667994;font-size:12px;padding:8px 0 0}",
    "@media(max-width:420px){.nombre{font-size:24px}.hero h1{font-size:26px}.lista{grid-template-columns:1fr}}",
    "</style>",
    "</head>",
    "<body>",
    '<div class="wrap">',
    '<section class="hero" style="' + fondo + '">',
    '<div class="contenido">',
    '<div class="marca">',
    '<div class="logo"><svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="4"/><circle cx="9" cy="13" r="1.4"/><circle cx="15" cy="13" r="1.4"/><path d="M12 7V4M10 20h4"/></svg></div>',
    "<div>",
    `<div class="nombre">${esc(nombre)}</div>`,
    '<div class="subtitulo">MENÚ INTERACTIVO</div>',
    "</div>",
    `<div class="contador">${total} cmds</div>`,
    "</div>",
    '<div class="abajo">',
    '<span class="etiqueta">✦ MENÚ PREMIUM</span>',
    `<h1>${esc(nombre)}</h1>`,
    `<p>${esc(DESCRIPCION)}</p>`,
    "</div>",
    "</div>",
    "</section>",
    '<label class="buscar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="q" type="search" placeholder="Buscar comando..." autocomplete="off"><button id="limpiar" aria-label="Limpiar">×</button></label>',
    '<div class="chips" id="chips"></div>',
    '<div id="resultado"></div>',
    `<footer>${esc(nombre)} · ${esc(prefijo)} delante de cada comando</footer>`,
    "</div>",
    "<script>",
    `const datos=${json};`,
    `const prefijo=${JSON.stringify(prefijo)};`,
    "const q=document.getElementById('q');",
    "const chips=document.getElementById('chips');",
    "const resultado=document.getElementById('resultado');",
    "let activa=(datos.find(g=>g.titulo==='Subbots')||datos[0]||{}).titulo||null;",
    "function pintarChips(){chips.innerHTML='';const todo=document.createElement('button');todo.className='chip'+(activa===null?' activo':'');todo.textContent='Todos';todo.onclick=()=>{activa=null;pintarChips();pintar()};chips.appendChild(todo);for(const g of datos){const b=document.createElement('button');b.className='chip'+(activa===g.titulo?' activo':'');b.textContent=g.emoji+' '+g.titulo;b.onclick=()=>{activa=g.titulo;pintarChips();pintar()};chips.appendChild(b)}}",
    "function pintar(){const aguja=q.value.trim().toLowerCase();resultado.innerHTML='';let total=0;for(const g of datos){if(activa&&activa!==g.titulo)continue;const filas=g.comandos.filter(c=>(c.nombre+' '+c.alias.join(' ')).toLowerCase().includes(aguja));if(!filas.length)continue;total+=filas.length;const grupo=document.createElement('section');grupo.className='grupo';const cab=document.createElement('div');cab.className='cabecera';cab.innerHTML='<div class=\"icono\">'+g.emoji+'</div><div><h2>'+g.titulo+'</h2><p>'+g.descripcion+'</p></div><div class=\"contador\">'+filas.length+'</div>';grupo.appendChild(cab);const barra=document.createElement('div');barra.className='barra';grupo.appendChild(barra);const lista=document.createElement('div');lista.className='lista';for(const c of filas){const boton=document.createElement('button');boton.className='pildora';boton.innerHTML='<span class=\"punto\"></span><span>'+prefijo+c.nombre+'</span><span class=\"flecha\">›</span>';boton.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(prefijo+c.nombre);boton.classList.add('copiado');setTimeout(()=>boton.classList.remove('copiado'),900)};lista.appendChild(boton)}grupo.appendChild(lista);resultado.appendChild(grupo)}if(!total){const p=document.createElement('p');p.className='vacio';p.textContent='Sin resultados para «'+q.value+'»';resultado.appendChild(p)}}",
    "q.addEventListener('input',pintar);",
    "document.getElementById('limpiar').onclick=()=>{q.value='';pintar();q.focus()};",
    "pintarChips();pintar();",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}
