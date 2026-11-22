/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 *
 * lib/menu-ayuda.js — la guía rápida del menú y las marcas de cada comando.
 *
 * La guía es la de Shin-MD, tal cual la escribió su autor (mismos símbolos y
 * mismo texto). Las marcas no se ponen a mano: se leen de los plugins ya
 * cargados, así que un comando solo lleva Ⓓ si de verdad es de dueño y Ⓐ si de
 * verdad pide administrador. Si un comando no declara nada, no lleva marca; no
 * se inventa una.
 */

/** La guía rápida, palabra por palabra como en Shin-MD. */
export const LEYENDA = `〔 🔖 GUÍA RÁPIDA 〕

―――――――◆
│ Ⓓ Dueño • Ⓟ Premium • Ⓐ Admin
│ Ⓖ Grupos • Ⓛ Límite
―――――――◆

Para ver una categoría completa, pásale su nombre al comando de menú.`;

/**
 * Crédito del menú, con el texto exacto del autor de Shin-MD. Va aparte para
 * poder moverlo o quitarlo de un sitio sin tocar el resto del menú.
 *
 * El canal es el de Shin-MD, no el de Ado-Bot: este texto se muestra como
 * atribución del menú portado, así que apunta al proyecto de origen. El canal
 * propio del bot va en `plugins/info/menu.js` (CANAL_URL) y ese sí es de Ado.
 */
export const CREDITO = `📢 Canal: https://whatsapp.com/channel/0029VbDVFpSGJP89hfZUe522
Shin-MD · Bot de WhatsApp Profesional
github.com/riokuroxi-svg/Shin-MD`;

/** Qué marca lleva un plugin según lo que declara (o ninguna). */
export function marcaDe(plugin) {
  if (!plugin) return "";
  if (plugin.isOwner) return "Ⓓ";
  if (plugin.isAdmin) return "Ⓐ";
  if (plugin.isPremium) return "Ⓟ";
  return "";
}

/**
 * Pone la marca delante de cada comando que aparezca en el texto.
 *
 * @param {string} texto      el menú ya escrito
 * @param {string} prefijo    el prefijo en uso (ej. ".")
 * @param {Map}    comandos   el mapa de pluginLoader (nombre → plugin)
 * @returns {string}
 */
export function marcar(texto, prefijo, comandos) {
  if (!texto || !comandos || !comandos.size) return texto;

  // Los nombres largos primero: si no, «menu» marcaría dentro de «menucat».
  const nombres = [...comandos.keys()].sort((a, b) => b.length - a.length);
  const escapado = prefijo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patron = new RegExp(
    `${escapado}(${nombres.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\wáéíóúñ])`,
    "gi"
  );

  return texto.replace(patron, (todo, nombre) => {
    const plugin = comandos.get(String(nombre).toLowerCase());
    const marca = marcaDe(plugin);
    return marca ? `${marca} ${todo}` : todo;
  });
}

/**
 * Las categorías del menú, en el orden en que se enseñan.
 *
 * La clave es la carpeta de `plugins/`: si mañana se añade una carpeta nueva y
 * no está aquí, no desaparece, sale al final con el nombre de la carpeta. Así el
 * menú nunca miente sobre lo que el bot tiene cargado.
 */
export const CATEGORIAS = [
  { carpeta: "economia", titulo: "Economía", emoji: "🎁", descripcion: "Gana, apuesta y guarda coins con tus amigos." },
  { carpeta: "rpg", titulo: "RPG", emoji: "⚔️", descripcion: "Oficios, recursos y clases de aventurero." },
  { carpeta: "rpg", titulo: "Mascotas", emoji: "🐾", descripcion: "Adopta, cuida y pelea con tu mascota.", solo: ["adoptar", "animal", "nombrar", "acariciar", "alimentar", "pasear", "animaltop", "pelear", "atacar", "cambiar", "huir", "capturar", "petactivo"] },
  { carpeta: "gacha", titulo: "Gacha", emoji: "🎴", descripcion: "Tira, reclama y presume de colección." },
  { carpeta: "perfil", titulo: "Perfil", emoji: "🌟", descripcion: "Tu ficha, tu nivel y tu gente." },
  { carpeta: "descargas", titulo: "Descargas", emoji: "📥", descripcion: "Música, vídeos y archivos de varias fuentes." },
  { carpeta: "stickers", titulo: "Stickers", emoji: "🖌️", descripcion: "Crea stickers y paquetes." },
  { carpeta: "ia", titulo: "IA", emoji: "🧠", descripcion: "Texto, voz, imagen y música." },
  { carpeta: "fun", titulo: "Diversión", emoji: "🎉", descripcion: "Juegos y tonterías para el grupo." },
  { carpeta: "utils", titulo: "Utilidades", emoji: "🔔", descripcion: "Lo del día a día: clima, QR, recordatorios." },
  { carpeta: "info", titulo: "Info", emoji: "ℹ️", descripcion: "El bot contándose a sí mismo." },
  { carpeta: "admin", titulo: "Admin", emoji: "🛡️", descripcion: "Herramientas para administrar el grupo." },
  { carpeta: "subbots", titulo: "Sub-bots", emoji: "🤖", descripcion: "Tu propio bot colgado de este." },
  { carpeta: "owner", titulo: "Owner", emoji: "👑", descripcion: "Solo para los dueños del bot." },
  { carpeta: "premium", titulo: "Premium", emoji: "💎", descripcion: "Lo que trae el plan premium." },
  { carpeta: "test", titulo: "Test", emoji: "🧪", descripcion: "Pruebas internas del bot." },
];

/** Nombre visible de una carpeta, aunque no esté en la lista de arriba. */
export function tituloDe(carpeta) {
  const hallada = CATEGORIAS.find((c) => c.carpeta === carpeta);
  if (hallada) return hallada;
  const nombre = String(carpeta || "").replace(/^./, (l) => l.toUpperCase());
  return { carpeta, titulo: nombre, emoji: "📁", descripcion: "" };
}

/**
 * Agrupa los plugins cargados por categoría.
 *
 * Devuelve, por categoría, la lista de comandos con su nombre principal y sus
 * alias. Un plugin que se registra con seis nombres sale UNA vez, con los otros
 * cinco como alias: antes el menú repetía el mismo comando cinco veces.
 *
 * @param {Map} comandos el mapa de `pluginLoader` (nombre → plugin)
 * @param {Set} [ocultos] nombres que no se enseñan (los propios del menú)
 */
export function catalogo(comandos, ocultos = new Set()) {
  if (!comandos || !comandos.size) return [];

  const porCarpeta = new Map();
  for (const [nombre, plugin] of comandos) {
    if (!plugin || ocultos.has(nombre)) continue;
    const carpeta = plugin.carpeta || "otros";
    if (!porCarpeta.has(carpeta)) porCarpeta.set(carpeta, new Map());
    porCarpeta.get(carpeta).set(plugin, nombre);
  }

  const salida = [];
  for (const [carpeta, plugins] of porCarpeta) {
    const comandos_ = [];
    for (const [plugin, cualquiera] of plugins) {
      const nombres = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      const principal = nombres[0] || cualquiera;
      comandos_.push({
        nombre: String(principal).toLowerCase(),
        otro: cualquiera !== principal ? String(cualquiera).toLowerCase() : null,
        alias: nombres.slice(1).map((n) => String(n).toLowerCase()),
        plugin,
      });
    }
    comandos_.sort((a, b) => a.nombre.localeCompare(b.nombre));
    // Dos archivos pueden declarar el mismo comando (pasa con `ppt` y con
    // `setdesc`): en el menú sale uno solo, el primero por orden alfabético.
    const vistos = new Set();
    const unicos = comandos_.filter((c) => {
      if (vistos.has(c.nombre)) return false;
      vistos.add(c.nombre);
      return true;
    });
    salida.push({ carpeta, comandos: unicos });
  }

  const orden = new Map(CATEGORIAS.map((c, i) => [c.carpeta, i]));
  salida.sort((a, b) => (orden.get(a.carpeta) ?? 99) - (orden.get(b.carpeta) ?? 99) || a.carpeta.localeCompare(b.carpeta));

  // Las categorías que comparten carpeta (RPG y Mascotas) se separan por su
  // propia lista: un comando pertenece a la primera que lo nombre.
  const usados = new Set();
  const vistas = [];
  for (const bloque of salida) {
    // Las categorías con lista propia (Mascotas dentro de rpg) se quedan sus
    // comandos ANTES de que la categoría general se lleve el resto.
    const conLista = CATEGORIAS.filter((c) => c.carpeta === bloque.carpeta && c.solo);
    const general = CATEGORIAS.find((c) => c.carpeta === bloque.carpeta && !c.solo);
    for (const especifica of conLista) {
      const suyos = bloque.comandos.filter(
        (c) => !usados.has(c.nombre) && (especifica.solo.includes(c.nombre) || c.alias.some((a) => especifica.solo.includes(a)))
      );
      suyos.forEach((c) => usados.add(c.nombre));
      if (suyos.length) vistas.push({ ...tituloDe(bloque.carpeta), ...especifica, comandos: suyos });
    }
    const resto = bloque.comandos.filter((c) => !usados.has(c.nombre));
    resto.forEach((c) => usados.add(c.nombre));
    if (resto.length) vistas.push({ ...tituloDe(bloque.carpeta), ...(general || {}), comandos: resto });
  }
  return vistas;
}

/** Los nombres con los que se busca una categoría (`menu rpg`, `menu mascotas`…). */
export function buscarCategoria(catalogo_, pedido) {
  const busca = String(pedido || "").toLowerCase().trim();
  if (!busca) return null;
  return (
    catalogo_.find(
      (c) =>
        c.carpeta === busca ||
        c.titulo.toLowerCase() === busca ||
        c.titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
          busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    ) || null
  );
}
