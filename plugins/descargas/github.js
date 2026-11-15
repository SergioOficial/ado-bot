/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * plugins/descargas/github.js — buscar repos, ver un perfil y bajar un repo en ZIP.
 *
 * De dónde sale: la rama `seguridad-1.1.0` tenía esta versión extendida
 * (`gitclone`, `gituser`, token opcional) y `main` sólo conservaba la búsqueda.
 * Se portó entera y por el camino se le corrigieron cuatro cosas:
 *
 *   1. LA API. `main` pasaba por un intermediario de terceros
 *      (natsu-api.darkcore.xyz) con su `NATSU_API_KEY`, y la rama hablaba con
 *      api.github.com. Se queda la oficial: un salto menos, una clave de otro
 *      menos que puede caer o cambiar de precio, y el mismo resultado.
 *      `GITHUB_TOKEN` es OPCIONAL y sólo sube el límite de peticiones
 *      (60/hora anónimo, 5000/hora con token).
 *
 *   2. EL PREFIJO. La rama imprimía `${config.prefix}` y en este bot `prefix` es
 *      un ARRAY ([".", "#", "/", "🇨🇺"]), así que la ayuda salía
 *      «.,#,/,🇨🇺gitclone». Aquí se usa `prefijoDe(config)`, que acepta las dos
 *      formas y no se rompe si falta.
 *
 *   3. LA DESCARGA. `pedirSeguro` rechaza las redirecciones A PROPÓSITO (es su
 *      protección contra SSRF: un enlace público que redirige a una IP privada),
 *      y `.../repos/{o}/{r}/zipball` de GitHub responde justo con un 302. Con la
 *      versión de la rama eso no pasaba porque usaba axios, que sí sigue
 *      redirecciones y se salta el filtro entero. Aquí no se usa zipball: se pide
 *      el repo a la API —que de paso devuelve el tamaño y la rama por defecto— y
 *      se baja directo de codeload.github.com, que sirve el ZIP sin redirección.
 *      Ventaja extra: se puede rechazar un repo de 400 MB ANTES de bajarlo.
 *
 *   4. LOS NOMBRES. La rama hacía `repoPath.split("/")` e interpolaba tal cual en
 *      la URL. `validarRepo` comprueba el juego de caracteres que GitHub permite
 *      de verdad, acepta una URL completa, y devuelve `null` en cuanto ve algo
 *      raro: sin eso, un `.gitclone ../../etc` acabaría dentro de una URL.
 *
 * Ninguna de estas cuatro cosas la ve una prueba de humo con contexto falso: las
 * tres primeras necesitan red y la cuarta necesita que alguien escriba algo raro.
 * Por eso las puras (`validarRepo`, `validarUsuario`, `urlDelZip`, los
 * formateadores y `mensajeDeError`) salen exportadas y tienen prueba propia en
 * `pruebas/github.test.mjs`.
 */

import axios from "axios";
import { pedirSeguro } from "../../lib/red-segura.js";

const API = "https://api.github.com";
const CODELOAD = "https://codeload.github.com";

/** Tope del ZIP de un repo. 40 MB: por encima ya no es un repo, es un vertedero. */
export const MAX_ZIP = 40 * 1024 * 1024;

/** Tope del avatar. Son PNG de 460×460; 2 MB sobra y corta un abuso. */
export const MAX_AVATAR = 2 * 1024 * 1024;

/** Cuánto se espera una respuesta de la API (JSON, va rápido). */
export const PLAZO_API = 20_000;

/** Cuánto se espera el ZIP. Codeload lo genera al vuelo y eso tarda. */
export const PLAZO_ZIP = 180_000;

/**
 * Lo que GitHub admite en un nombre de usuario, repo, organización o rama.
 * Empieza en alfanumérico y sigue con alfanumérico, punto, guion o guion bajo.
 * Deliberadamente NO admite barras, espacios, dos puntos ni `..`.
 */
const NOMBRE_GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

/** Un login de GitHub mide como mucho 39 caracteres. */
const LARGO_LOGIN = 39;

/**
 * Cabeceras para la API oficial.
 *
 * GitHub exige un `user-agent` en toda petición: sin él responde 403. El token
 * es opcional y sólo cambia el límite de peticiones, así que su ausencia no es un
 * error y no se avisa de ella.
 *
 * @param {string} [token] por defecto `process.env.GITHUB_TOKEN`
 * @returns {object} cabeceras listas para axios o fetch
 */
export function cabecerasDe(token = process.env.GITHUB_TOKEN) {
  const cabeceras = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "user-agent": "riokuroxi (+https://github.com/riokuroxi-svg)",
  };
  const limpio = typeof token === "string" ? token.trim() : "";
  if (limpio) cabeceras.Authorization = `Bearer ${limpio}`;
  return cabeceras;
}

/**
 * El prefijo que se muestra en la ayuda.
 *
 * En este bot `config.prefix` es un array de varios prefijos; en otros sitios es
 * una cadena. Se aceptan las dos formas y se cae en "." si no viene nada, para
 * que la ayuda nunca salga con `undefined` delante ni con el array entero.
 *
 * @param {object} [config]
 * @returns {string}
 */
export function prefijoDe(config) {
  const p = config?.prefix;
  if (Array.isArray(p)) return String(p[0] ?? ".");
  if (typeof p === "string" && p) return p;
  return ".";
}

/**
 * Valida `usuario/repositorio` y devuelve las dos piezas limpias, o `null`.
 *
 * Acepta también la URL completa (`.gitclone https://github.com/x/y`) y el sufijo
 * `.git`, porque es lo que la gente copia de GitHub. Rechaza todo lo demás: más o
 * menos de dos piezas, caracteres fuera del juego de GitHub, piezas vacías o `..`.
 *
 * @param {string} crudo lo que escribió el usuario
 * @returns {{owner: string, repo: string}|null}
 */
export function validarRepo(crudo) {
  const texto = String(crudo ?? "")
    .trim()
    // El esquema es opcional: «github.com/a/b» se copia igual que la URL entera.
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/^\/+/, "")
    // La barra va antes que el `.git`, que si no «a/b.git/» se queda con el .git.
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "");

  if (!texto) return null;

  const partes = texto.split("/");
  if (partes.length !== 2) return null;

  const [owner, repo] = partes;
  if (!NOMBRE_GITHUB.test(owner) || !NOMBRE_GITHUB.test(repo)) return null;

  return { owner, repo };
}

/**
 * Valida un login de GitHub y lo devuelve limpio (sin `@`, sin URL), o `null`.
 *
 * @param {string} crudo
 * @returns {string|null}
 */
export function validarUsuario(crudo) {
  const texto = String(crudo ?? "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\/+$/, "");

  if (!texto || texto.length > LARGO_LOGIN) return null;
  return NOMBRE_GITHUB.test(texto) ? texto : null;
}

/**
 * La URL directa del ZIP en codeload, que NO redirige.
 *
 * `pedirSeguro` corta las redirecciones a propósito, así que hay que llegar al
 * destino final sin pasar por el 302 de `zipball`. Con la rama por defecto que da
 * la API se pide `refs/heads/<rama>`; sin ella se pide `HEAD`, que codeload
 * resuelve a la rama por defecto.
 *
 * @param {string} owner ya validado por `validarRepo`
 * @param {string} repo  ya validado por `validarRepo`
 * @param {string} [rama] `default_branch` según la API
 * @returns {string}
 */
export function urlDelZip(owner, repo, rama) {
  const limpia = String(rama ?? "")
    .split("/")
    .filter((p) => p && p !== ".." && NOMBRE_GITHUB.test(p))
    .join("/");
  return limpia ? `${CODELOAD}/${owner}/${repo}/zip/refs/heads/${limpia}` : `${CODELOAD}/${owner}/${repo}/zip/HEAD`;
}

/**
 * Texto de la ayuda de `.github`.
 *
 * @param {string} prefijo
 * @returns {string}
 */
export function ayudaDe(prefijo) {
  return (
    `🐙 *GITHUB*\n\n` +
    `➤ ${prefijo}gitsearch <término> → buscar repositorios\n` +
    `➤ ${prefijo}gituser <usuario> → perfil de un usuario\n` +
    `➤ ${prefijo}gitclone <usuario/repo> → el repo en un ZIP\n\n` +
    `_Ejemplo: ${prefijo}gitclone WhiskeySockets/Baileys_\n` +
    `_También acepta la URL: ${prefijo}gitclone https://github.com/riokuroxi-svg/Shin-MD_`
  );
}

/**
 * Convierte los `items` de la API en el texto que se manda.
 *
 * Aguanta los campos que faltan: la búsqueda de GitHub devuelve objetos completos,
 * pero si algún día llega otra forma, nada de esto revienta — sale «Desconocido» o
 * «Sin descripción» y ya.
 *
 * @param {object[]} items
 * @param {string} query lo que se buscó, para la cabecera
 * @param {number} [cuantos=5]
 * @returns {string}
 */
export function formatearBusqueda(items, query, cuantos = 5) {
  const lista = Array.isArray(items) ? items.slice(0, cuantos) : [];
  let texto = `🔍 *RESULTADOS DE GITHUB:* "${query}"\n\n`;

  lista.forEach((repo, i) => {
    const nombre = repo.full_name || repo.name || "Desconocido";
    const url = repo.html_url || `https://github.com/${nombre}`;
    const estrellas = Number(repo.stargazers_count ?? repo.stars ?? 0);
    const forks = Number(repo.forks_count ?? 0);
    const desc = String(repo.description ?? "").slice(0, 80);
    const idioma = repo.language ? ` | 📝 ${repo.language}` : "";

    texto += `*${i + 1}.* [${nombre}](${url})\n`;
    texto += `   ⭐ ${estrellas.toLocaleString("es-MX")} | 🍴 ${forks.toLocaleString("es-MX")}${idioma}\n`;
    texto += `   📖 ${desc || "Sin descripción"}${String(repo.description ?? "").length > 80 ? "…" : ""}\n\n`;
  });

  return texto.trim();
}

/**
 * Convierte el perfil de la API en el texto que se manda.
 *
 * @param {object} u respuesta de `/users/{login}`
 * @returns {string}
 */
export function formatearPerfil(u) {
  const num = (v) => Number(v ?? 0).toLocaleString("es-MX");
  return (
    `🐙 *PERFIL DE GITHUB*\n` +
    `┏━━━━━━━━━━━━━━━━━━┓\n` +
    `┃ 👤 *Nombre:* ${u?.name || u?.login || "Desconocido"}\n` +
    `┃ 🆔 *Usuario:* @${u?.login || "?"}\n` +
    `┃ 📝 *Bio:* ${u?.bio || "Sin biografía"}\n` +
    `┃ 🏢 *Empresa:* ${u?.company || "N/A"}\n` +
    `┃ 📍 *Ubicación:* ${u?.location || "N/A"}\n` +
    `┃ 👥 *Seguidores:* ${num(u?.followers)}\n` +
    `┃ 📦 *Repositorios:* ${num(u?.public_repos)}\n` +
    `┃ 🔗 *URL:* ${u?.html_url || "N/A"}\n` +
    `┗━━━━━━━━━━━━━━━━━━┛`
  );
}

/**
 * Traduce un fallo de la API a algo que se entiende en WhatsApp.
 *
 * El caso que de verdad importa es el 403 por límite de peticiones: anónimo son
 * 60 por hora y se agota en cuanto un grupo se pone a buscar repos. Decir sólo
 * «Error: Request failed with status code 403» no le sirve a nadie; aquí se dice
 * qué pasa y quién puede arreglarlo.
 *
 * @param {unknown} e
 * @returns {string}
 */
export function mensajeDeError(e) {
  const estado = e?.response?.status ?? e?.status;
  const detalle = String(e?.response?.data?.message || e?.message || "fallo desconocido");

  if (estado === 404) return "Ese repositorio no existe o es privado.";
  if (estado === 422) return "La búsqueda no es válida para GitHub.";
  if (estado === 403 || estado === 429) {
    if (/rate limit|abuse detection/i.test(detalle)) {
      return (
        "Se agotó el límite de peticiones a GitHub (60 por hora sin token). " +
        "El dueño del bot puede poner la variable de entorno GITHUB_TOKEN y sube a 5000 por hora."
      );
    }
    return `GitHub no dejó hacer la petición: ${detalle}`;
  }
  if (e?.code === "ECONNABORTED" || /timeout/i.test(detalle)) return "GitHub tardó demasiado en contestar.";
  return detalle;
}

export default {
  command: ["gitsearch", "githubsearch", "ghsearch", "gitclone", "gituser", "github"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config, comando } = ctx;
    const prefijo = prefijoDe(config);
    const cabeceras = cabecerasDe();

    /** Reacciona sin que un fallo de la reacción tumbe el comando. */
    const reaccion = async (emoji) => {
      try {
        await sock.sendMessage(from, { react: { text: emoji, key: m.key } });
      } catch {
        // La reacción es adorno: si no sale, el comando sigue.
      }
    };

    // ── .github → la ayuda ────────────────────────────────────────────────────
    // También es el camino por defecto: si `comando` viene vacío o no es ninguno
    // de los conocidos, se enseña la ayuda en vez de tocar la red. Así la prueba
    // de humo (que llama con args vacíos) no hace ni una petición.
    if (!comando || comando === "github") {
      return enviartexto(ayudaDe(prefijo));
    }

    // ── .gitclone usuario/repo → el ZIP ───────────────────────────────────────
    if (comando === "gitclone") {
      const destino = validarRepo(args[0]);
      if (!destino) {
        return enviartexto(
          `📦 Uso: ${prefijo}gitclone <usuario/repositorio>\n` +
            `Ejemplo: ${prefijo}gitclone WhiskeySockets/Baileys\n` +
            `_También acepta la URL completa del repo._`
        );
      }

      const { owner, repo } = destino;
      await reaccion("📦");
      const aviso = await enviartexto(`📦 *Descargando repositorio…*\n_${owner}/${repo}_`);

      try {
        // 1. Los datos del repo: rama por defecto y tamaño ANTES de bajar nada.
        const meta = await axios.get(`${API}/repos/${owner}/${repo}`, {
          headers: cabeceras,
          timeout: PLAZO_API,
        });
        const rama = meta.data?.default_branch;
        const bytes = Number(meta.data?.size ?? 0) * 1024; // la API da kilobytes

        if (bytes > MAX_ZIP) {
          throw new Error(
            `Ese repo pesa ${(bytes / 1048576).toFixed(1)} MB y el tope son ${MAX_ZIP / 1048576} MB.`
          );
        }

        // 2. El ZIP, directo de codeload (sin el 302 de zipball) y por el mismo
        //    camino filtrado que el resto de descargas del bot.
        const { buffer } = await pedirSeguro(urlDelZip(owner, repo, rama), {
          max: MAX_ZIP,
          plazo: PLAZO_ZIP,
        });

        await sock.sendMessage(
          from,
          {
            document: buffer,
            fileName: `${repo}.zip`,
            mimetype: "application/zip",
            caption:
              `✅ *Repositorio descargado*\n` +
              `> ${meta.data?.full_name || `${owner}/${repo}`}\n` +
              `> Rama: ${rama || "por defecto"} · ${(buffer.length / 1048576).toFixed(1)} MB\n\n` +
              `_El ZIP trae la carpeta raíz con el nombre del repo._`,
          },
          { quoted: m }
        );

        if (aviso?.key) await sock.sendMessage(from, { delete: aviso.key }).catch(() => {});
        await reaccion("✅");
      } catch (e) {
        if (aviso?.key) await sock.sendMessage(from, { delete: aviso.key }).catch(() => {});
        await reaccion("❌");
        return enviartexto(`❌ *No pude descargar el repo.*\n_${mensajeDeError(e)}_`);
      }
      return;
    }

    // ── .gituser usuario → el perfil ──────────────────────────────────────────
    if (comando === "gituser") {
      const login = validarUsuario(args[0]);
      if (!login) {
        return enviartexto(`👤 Uso: ${prefijo}gituser <nombre_de_usuario>\nEjemplo: ${prefijo}gituser riokuroxi-svg`);
      }

      await reaccion("👤");
      try {
        const res = await axios.get(`${API}/users/${login}`, { headers: cabeceras, timeout: PLAZO_API });
        const texto = formatearPerfil(res.data);

        // El avatar viene en una URL que responde la API: se baja por el camino
        // filtrado y, si falla, se manda el texto solo. Un perfil sin foto sigue
        // siendo un perfil.
        if (res.data?.avatar_url) {
          try {
            const { buffer } = await pedirSeguro(res.data.avatar_url, { max: MAX_AVATAR });
            await sock.sendMessage(from, { image: buffer, caption: texto }, { quoted: m });
          } catch {
            await enviartexto(texto);
          }
        } else {
          await enviartexto(texto);
        }

        await reaccion("✅");
      } catch (e) {
        await reaccion("❌");
        return enviartexto(`❌ *No pude ver ese perfil.*\n_${mensajeDeError(e)}_`);
      }
      return;
    }

    // ── .gitsearch término → la búsqueda ──────────────────────────────────────
    const query = args.join(" ").trim();
    if (!query) {
      return enviartexto(
        `🔍 Uso: ${prefijo}gitsearch <término de búsqueda>\nEjemplo: ${prefijo}gitsearch whatsapp bot baileys`
      );
    }

    await reaccion("🔍");
    const espera = await sock
      .sendMessage(from, { text: `🔍 *Buscando repositorios de:* "${query}"…` }, { quoted: m })
      .catch(() => null);

    try {
      const res = await axios.get(`${API}/search/repositories`, {
        headers: cabeceras,
        timeout: PLAZO_API,
        params: { q: query, sort: "stars", order: "desc", per_page: 5 },
      });

      const items = res.data?.items;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error(`No se encontraron repositorios para "${query}".`);
      }

      const texto = formatearBusqueda(items, query);
      // Editar el «buscando…» en vez de mandar dos mensajes: menos ruido en el chat.
      const editado = espera?.key
        ? await sock.sendMessage(from, { text: texto, edit: espera.key }).catch(() => null)
        : null;
      if (!editado) await enviartexto(texto);

      await reaccion("✅");
    } catch (e) {
      await reaccion("❌");
      const texto = `❌ *Error al buscar en GitHub.*\n🔎 Detalle: _${mensajeDeError(e)}_`;
      const editado = espera?.key ? await sock.sendMessage(from, { text: texto, edit: espera.key }).catch(() => null) : null;
      if (!editado) await enviartexto(texto);
    }
  },
};
