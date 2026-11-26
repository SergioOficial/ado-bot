/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/panel-web.js — el panel de comandos que se abre dentro de WhatsApp.
 *
 * Es HTML estático, sin fuentes, imágenes ni scripts externos: cualquier
 * webview de WhatsApp lo dibuja igual y no depende de un servidor propio.
 */

/** Escapa texto que va dentro del HTML. */
function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** JSON seguro para meter dentro de una etiqueta <script>. */
function jsonSeguro(valor) {
  return JSON.stringify(valor)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Genera el documento completo.
 *
 * @param {Array<{titulo:string,emoji?:string,descripcion?:string,comandos:Array<{nombre:string,alias?:string[],descripcion?:string}>}>} grupos
 * @param {object} [opciones]
 * @param {string} [opciones.nombre] nombre del bot
 * @param {string} [opciones.prefijo] prefijo de comandos
 * @param {number} [opciones.contador] total que se muestra en la insignia
 * @returns {string}
 */
export function htmlPanel(grupos = [], opciones = {}) {
  const nombre = String(opciones.nombre || "Ado-Bot").trim() || "Ado-Bot";
  const prefijo = String(opciones.prefijo || ".").trim() || ".";
  const calculado = grupos.reduce((n, g) => n + (g.comandos?.length || 0), 0);
  const contador = Number.isFinite(Number(opciones.contador)) && Number(opciones.contador) > 0
    ? Number(opciones.contador)
    : calculado;

  const datos = grupos.map((g) => ({
    titulo: String(g.titulo || "Otros"),
    emoji: String(g.emoji || "•"),
    descripcion: String(g.descripcion || ""),
    comandos: (g.comandos || []).map((c) => ({
      nombre: String(c.nombre || ""),
      alias: (c.alias || []).map(String),
      descripcion: String(c.descripcion || ""),
    })),
  }));

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#080c16">
<title>Menú</title>
<style>
:root{color-scheme:dark;--fondo:#080c16;--tarjeta:#111a29;--borde:#26364d;--texto:#edf2fa;--suave:#93a4bb;--verde:#39d98a}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:radial-gradient(900px 520px at 50% -12%,#1a3159 0,var(--fondo) 68%);color:var(--texto);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
.wrap{max-width:540px;margin:0 auto;padding:14px 14px 28px}
.hero{position:relative;min-height:306px;border:1px solid #2c4a70;border-radius:20px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.45);background:
 radial-gradient(380px 280px at 78% 22%,rgba(92,62,180,.55),transparent 70%),
 radial-gradient(420px 300px at 18% 8%,rgba(31,113,170,.5),transparent 72%),
 linear-gradient(160deg,#101a3a 0%,#1a1233 52%,#070d1a 100%)}
.hero:before{content:'';position:absolute;inset:0;opacity:.45;background-image:radial-gradient(1px 1px at 20% 18%,#fff 50%,transparent),radial-gradient(1px 1px at 68% 32%,#bcd7ff 50%,transparent),radial-gradient(1px 1px at 42% 60%,#fff 50%,transparent),radial-gradient(1px 1px at 84% 72%,#9fbfff 50%,transparent),radial-gradient(1px 1px at 12% 82%,#fff 50%,transparent);background-size:170px 140px}
.hero:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,14,28,.05) 0%,rgba(8,14,28,.28) 52%,rgba(8,14,28,.94) 100%)}
.hero .contenido{position:relative;z-index:1;padding:18px;display:flex;flex-direction:column;min-height:306px}
.marca{display:flex;align-items:center;gap:12px}
.logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(145deg,#6ee7ff,#2563eb);display:grid;place-items:center;border:1px solid rgba(255,255,255,.35);box-shadow:0 8px 24px rgba(38,110,255,.35)}
.logo svg{width:30px;height:30px;stroke:#0b1730;fill:none;stroke-width:1.8}
.nombre{font-size:28px;font-weight:800;letter-spacing:-.5px;line-height:1.05;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.subtitulo{font-size:11px;letter-spacing:3px;color:#b8c9e2;margin-top:4px;font-weight:600}
.marca .contador{margin-left:auto}
.contador{border:1px solid var(--verde);color:var(--verde);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;background:rgba(57,217,138,.1);white-space:nowrap}
.etiqueta{align-self:flex-start;margin-top:16px;padding:6px 13px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1px;background:linear-gradient(100deg,#2b4c8a,#17324f);border:1px solid #4d78b5;color:#dceaff}
.hero .abajo{margin-top:auto}
.hero h1{margin:10px 0 4px;font-size:30px;font-weight:800;text-shadow:0 2px 10px rgba(0,0,0,.55)}
.hero p{margin:0;color:#e2ebf8;font-size:14px;max-width:94%;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.buscar{display:flex;align-items:center;gap:10px;margin:14px 0 12px;padding:13px 15px;background:var(--tarjeta);border:1px solid var(--borde);border-radius:15px}
.buscar svg{width:18px;height:18px;stroke:var(--suave);fill:none;stroke-width:2;flex:0 0 auto}
.buscar input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--texto);font:inherit}
.buscar input::placeholder{color:#7b8ca4}
.buscar button{background:none;border:0;color:var(--suave);font-size:22px;line-height:1;cursor:pointer}
.chips{display:flex;gap:9px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{flex:0 0 auto;background:var(--tarjeta);color:var(--suave);border:1px solid var(--borde);border-radius:999px;padding:9px 15px;cursor:pointer;font-weight:600;white-space:nowrap}
.chip.activo{border-color:var(--verde);color:var(--verde);background:rgba(57,217,138,.1)}
.grupo{background:var(--tarjeta);border:1px solid var(--borde);border-radius:18px;padding:14px;margin-bottom:12px}
.cabecera{display:flex;gap:12px;align-items:center;margin-bottom:14px}
.icono{width:52px;height:52px;flex:0 0 auto;border-radius:15px;background:#162538;border:1px solid #29405e;display:grid;place-items:center;font-size:25px}
.cabecera h2{margin:0;font-size:19px}
.cabecera p{margin:3px 0 0;color:var(--suave);font-size:13px}
.cabecera .contador{margin-left:auto}
.barra{height:3px;width:62px;background:var(--verde);border-radius:3px;margin:0 0 12px 2px}
.lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.pildora{display:flex;align-items:center;gap:8px;background:#0f1928;border:1px solid var(--borde);border-radius:13px;padding:12px 13px;color:var(--verde);font-weight:700;text-align:left;cursor:pointer;min-width:0}
.pildora span.texto{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pildora .punto{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:var(--verde);box-shadow:0 0 9px rgba(57,217,138,.6)}
.pildora .flecha{margin-left:auto;color:#6f8199;font-size:18px}
.pildora.copiado{border-color:var(--verde);background:rgba(57,217,138,.09)}
.vacio{color:var(--suave);text-align:center;padding:28px 0}
footer{text-align:center;color:#667994;font-size:12px;padding:8px 0 0}
@media(max-width:420px){.nombre{font-size:24px}.hero h1{font-size:26px}.lista{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<section class="hero">
<div class="contenido">
<div class="marca">
<div class="logo"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="4"/><circle cx="9" cy="13" r="1.4"/><circle cx="15" cy="13" r="1.4"/><path d="M12 7V4M10 20h4"/></svg></div>
<div><div class="nombre">${esc(nombre)}</div><div class="subtitulo">MENÚ INTERACTIVO</div></div>
<div class="contador">${esc(contador)} cmds</div>
</div>
<div class="abajo">
<span class="etiqueta">✦ MENÚ PREMIUM</span>
<h1>${esc(nombre)}</h1>
<p>Eligue una categoría, busca o toca un comando para copiarlo</p>
</div>
</div>
</section>
<label class="buscar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="q" type="search" placeholder="Buscar comando..." autocomplete="off"><button id="limpiar" aria-label="Limpiar">×</button></label>
<div class="chips" id="chips"></div>
<div id="resultado"></div>
<footer>${esc(nombre)} · ${esc(prefijo)} delante de cada comando</footer>
</div>
<script>
const datos=${jsonSeguro(datos)};
const prefijo=${jsonSeguro(prefijo)};
const q=document.getElementById('q');
const chips=document.getElementById('chips');
const resultado=document.getElementById('resultado');
let activa=(datos[0]||{}).titulo||null;
function pintarChips(){
 chips.innerHTML='';
 const todo=document.createElement('button');
 todo.className='chip'+(activa===null?' activo':'');
 todo.textContent='Todos';
 todo.onclick=()=>{activa=null;pintarChips();pintar()};
 chips.appendChild(todo);
 for(const g of datos){
  const b=document.createElement('button');
  b.className='chip'+(activa===g.titulo?' activo':'');
  b.textContent=g.emoji+' '+g.titulo;
  b.onclick=()=>{activa=g.titulo;pintarChips();pintar()};
  chips.appendChild(b);
 }
}
function pintar(){
 const aguja=q.value.trim().toLowerCase();
 resultado.innerHTML='';
 let total=0;
 for(const g of datos){
  if(activa&&activa!==g.titulo)continue;
  const filas=g.comandos.filter(c=>(c.nombre+' '+c.alias.join(' ')+' '+c.descripcion).toLowerCase().includes(aguja));
  if(!filas.length)continue;
  total+=filas.length;
  const grupo=document.createElement('section');
  grupo.className='grupo';
  const cab=document.createElement('div');
  cab.className='cabecera';
  const icono=document.createElement('div');icono.className='icono';icono.textContent=g.emoji;
  const texto=document.createElement('div');
  const titulo=document.createElement('h2');titulo.textContent=g.titulo;
  const desc=document.createElement('p');desc.textContent=g.descripcion;
  texto.append(titulo,desc);
  const num=document.createElement('div');num.className='contador';num.textContent=filas.length;
  cab.append(icono,texto,num);
  grupo.appendChild(cab);
  const barra=document.createElement('div');barra.className='barra';grupo.appendChild(barra);
  const lista=document.createElement('div');lista.className='lista';
  for(const c of filas){
   const boton=document.createElement('button');
   boton.className='pildora';
   boton.title=c.descripcion||('Copiar '+prefijo+c.nombre);
   const punto=document.createElement('span');punto.className='punto';
   const etiqueta=document.createElement('span');etiqueta.className='texto';etiqueta.textContent=prefijo+c.nombre;
   const flecha=document.createElement('span');flecha.className='flecha';flecha.textContent='›';
   boton.append(punto,etiqueta,flecha);
   boton.onclick=()=>{
    const valor=prefijo+c.nombre;
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(valor).catch(()=>{});
    boton.classList.add('copiado');setTimeout(()=>boton.classList.remove('copiado'),900);
   };
   lista.appendChild(boton);
  }
  grupo.appendChild(lista);
  resultado.appendChild(grupo);
 }
 if(!total){const p=document.createElement('p');p.className='vacio';p.textContent='Sin resultados para «'+q.value+'»';resultado.appendChild(p)}
}
q.addEventListener('input',pintar);
document.getElementById('limpiar').onclick=()=>{q.value='';pintar();q.focus()};
pintarChips();pintar();
</script>
</body>
</html>`;
}

export default { htmlPanel };
