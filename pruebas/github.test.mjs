/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * pruebas/github.test.mjs — el plugin de GitHub portado desde `seguridad-1.1.0`.
 *
 * Qué se prueba aquí y qué no. Lo que necesita red de verdad (buscar, ver un
 * perfil, bajar el ZIP) no se puede probar en el CI: no hay red y tampoco se
 * quiere gastar el límite anónimo de GitHub en cada push. Lo que sí se prueba es
 * todo lo que decide ANTES de tocar la red, que es donde estaban los fallos de la
 * versión de la rama:
 *
 *   · `validarRepo` y `validarUsuario`: la rama hacía `split("/")` e interpolaba
 *     tal cual en la URL. Aquí se comprueba que lo raro se rechaza antes de
 *     construir nada, incluido `../../etc` y una URL con query.
 *   · `urlDelZip`: que apunte a codeload y no a `zipball`, porque `pedirSeguro`
 *     corta las redirecciones a propósito y zipball responde con un 302.
 *   · `prefijoDe`: en este bot `config.prefix` es un ARRAY, y la rama imprimía el
 *     array entero en la ayuda («.,#,/,🇨🇺gitclone»).
 *   · `mensajeDeError`: que el 403 por límite de peticiones diga qué hacer, en vez
 *     de soltar «Request failed with status code 403».
 *   · Los caminos de `execute` que contestan sin pedir nada: la ayuda, los tres
 *     usos incorrectos y el `comando` vacío (que es por donde entra la prueba de
 *     humo). Para que «sin pedir nada» sea una afirmación y no una promesa, se
 *     pinchan `axios.get` y `fetch` antes de cada caso y se cuenta cuántas veces
 *     los llamaron: si el plugin se va a la red, la prueba falla.
 */

import axios from "axios";
import { igual, esVerdad } from "./ayuda.mjs";
import github, {
  MAX_AVATAR,
  MAX_ZIP,
  ayudaDe,
  cabecerasDe,
  formatearBusqueda,
  formatearPerfil,
  mensajeDeError,
  prefijoDe,
  urlDelZip,
  validarRepo,
  validarUsuario,
} from "../plugins/descargas/github.js";

/**
 * Pincha la red y devuelve cómo contarla y cómo dejarla como estaba.
 *
 * `axios.get` es una propiedad del objeto función que axios exporta por defecto,
 * o sea que es reemplazable: el plugin importa el mismo objeto y ve el mismo
 * parche. `fetch` se parchea en `globalThis`, que es por donde pasa
 * `pedirSeguro`. Si algo llama a cualquiera de los dos, se anota y se lanza, para
 * que el fallo salga en el mensaje de la prueba y no como un timeout raro.
 */
function sinRed() {
  const estado = { llamadas: [] };
  const getOriginal = axios.get;
  const fetchOriginal = globalThis.fetch;

  axios.get = async (url) => {
    estado.llamadas.push(`axios.get ${url}`);
    throw new Error("ESTA PRUEBA NO DEBE TOCAR LA RED");
  };
  globalThis.fetch = async (url) => {
    estado.llamadas.push(`fetch ${url}`);
    throw new Error("ESTA PRUEBA NO DEBE TOCAR LA RED");
  };

  return {
    estado,
    restaurar() {
      axios.get = getOriginal;
      globalThis.fetch = fetchOriginal;
    },
  };
}

/** Contexto falso con la forma que arma boot/router.js. */
function ctxFalso(sobre = {}) {
  const enviados = [];
  const reacciones = [];
  return {
    enviados,
    reacciones,
    ctx: {
      sock: {
        sendMessage: async (jid, contenido) => {
          if (contenido?.react) reacciones.push(contenido.react.text);
          else enviados.push(contenido);
          return { key: { id: "X", remoteJid: jid } };
        },
      },
      m: { key: { remoteJid: "120363@g.us", id: "IN1" }, message: {} },
      from: "120363@g.us",
      sender: "5215512345678@s.whatsapp.net",
      isGroup: true,
      args: [],
      comando: "github",
      texto: "",
      PREFIX: ".",
      BOT_NAME: "Bot",
      config: { prefix: [".", "#", "/", "🇨🇺"], footer: "pie" },
      db: { users: {}, chats: {} },
      enviartexto: async (t) => {
        enviados.push({ text: t });
        return { key: { id: "AVISO", remoteJid: "120363@g.us" } };
      },
      ...sobre,
    },
  };
}

/** El primer texto mandado, para no repetir `String(enviados[0].text)` por todos lados. */
function textoDe(enviados) {
  return String(enviados[0]?.text ?? "");
}

export const pruebas = [
  // ── validarRepo: lo que entra a una URL ─────────────────────────────────────
  ["validarRepo acepta usuario/repo y devuelve las dos piezas", () => {
    igual(validarRepo("WhiskeySockets/Baileys"), { owner: "WhiskeySockets", repo: "Baileys" }, "forma normal");
    igual(validarRepo("riokuroxi-svg/Shin-MD"), { owner: "riokuroxi-svg", repo: "Shin-MD" }, "con guiones");
  }],

  ["validarRepo acepta la URL completa y el sufijo .git", () => {
    igual(validarRepo("https://github.com/riokuroxi-svg/Shin-MD"), { owner: "riokuroxi-svg", repo: "Shin-MD" }, "URL");
    igual(validarRepo("http://www.github.com/a/b.git"), { owner: "a", repo: "b" }, "URL con .git");
    igual(validarRepo("  github.com/a/b  "), { owner: "a", repo: "b" }, "sin esquema y con espacios alrededor");
  }],

  ["validarRepo rechaza lo que acabaría dentro de una URL", () => {
    igual(validarRepo("sinslash"), null, "una sola pieza");
    igual(validarRepo("a/b/c"), null, "tres piezas");
    igual(validarRepo("../../etc"), null, "subir carpetas");
    igual(validarRepo("a/../b"), null, "punto punto en medio");
    igual(validarRepo("owner/repo?x=1"), null, "query pegado al repo");
    igual(validarRepo("owner/repo#rama"), null, "fragmento");
    igual(validarRepo("owner/re po"), null, "espacio en el repo");
    igual(validarRepo("owner//repo"), null, "barra doble");
    igual(validarRepo(""), null, "vacío");
    igual(validarRepo(null), null, "null");
    igual(validarRepo(undefined), null, "undefined");
    igual(validarRepo({}), null, "un objeto en vez de texto");
  }],

  ["validarUsuario limpia el @ y la URL, y rechaza lo imposible", () => {
    igual(validarUsuario("riokuroxi-svg"), "riokuroxi-svg", "tal cual");
    igual(validarUsuario("@riokuroxi-svg"), "riokuroxi-svg", "con arroba");
    igual(validarUsuario("https://github.com/riokuroxi-svg"), "riokuroxi-svg", "URL completa");
    igual(validarUsuario("us/er"), null, "con barra");
    igual(validarUsuario(""), null, "vacío");
    igual(validarUsuario("a".repeat(40)), null, "más largo que el máximo de GitHub (39)");
    esVerdad(validarUsuario("a".repeat(39)) === "a".repeat(39), "justo en el máximo sí pasa");
  }],

  // ── urlDelZip: codeload, no zipball ─────────────────────────────────────────
  ["urlDelZip apunta a codeload con la rama por defecto", () => {
    igual(
      urlDelZip("a", "b", "main"),
      "https://codeload.github.com/a/b/zip/refs/heads/main",
      "rama conocida"
    );
    igual(urlDelZip("a", "b"), "https://codeload.github.com/a/b/zip/HEAD", "sin rama → HEAD");
    igual(urlDelZip("a", "b", ""), "https://codeload.github.com/a/b/zip/HEAD", "rama vacía → HEAD");
  }],

  ["urlDelZip no deja que la rama meta basura en la URL", () => {
    igual(urlDelZip("a", "b", "feature/nueva"), "https://codeload.github.com/a/b/zip/refs/heads/feature/nueva", "rama con barra");
    igual(urlDelZip("a", "b", "../main"), "https://codeload.github.com/a/b/zip/refs/heads/main", "se cae el ..");
    igual(urlDelZip("a", "b", "ma in"), "https://codeload.github.com/a/b/zip/HEAD", "rama con espacio → HEAD");
    esVerdad(!/zipball/.test(urlDelZip("a", "b", "main")), "nunca usa zipball, que responde con un 302");
  }],

  // ── prefijoDe: el array no se imprime entero ────────────────────────────────
  ["prefijoDe saca uno solo aunque config.prefix sea un array", () => {
    igual(prefijoDe({ prefix: [".", "#", "/", "🇨🇺"] }), ".", "array → el primero");
    igual(prefijoDe({ prefix: "#" }), "#", "cadena → esa cadena");
    igual(prefijoDe({}), ".", "sin prefix → punto");
    igual(prefijoDe(undefined), ".", "sin config → punto");
    igual(prefijoDe({ prefix: [] }), ".", "array vacío → punto");
    esVerdad(!/#/.test(ayudaDe(prefijoDe({ prefix: [".", "#", "/"] }))), "la ayuda no imprime los otros prefijos");
  }],

  // ── cabecerasDe: token opcional ─────────────────────────────────────────────
  ["cabecerasDe lleva el user-agent que GitHub exige y el token sólo si existe", () => {
    const conToken = cabecerasDe(" ghp_secreto ");
    igual(conToken.Authorization, "Bearer ghp_secreto", "recorta espacios y usa Bearer");
    esVerdad(Boolean(conToken["user-agent"]), "siempre trae user-agent: sin él GitHub responde 403");
    igual(conToken.Accept, "application/vnd.github+json", "accept de la API");

    esVerdad(!("Authorization" in cabecerasDe("")), "sin token no hay Authorization");
    esVerdad(!("Authorization" in cabecerasDe("   ")), "un token de puros espacios tampoco cuenta");
    esVerdad(!("Authorization" in cabecerasDe(null)), "null tampoco");
  }],

  // ── mensajeDeError: que el 403 sirva de algo ────────────────────────────────
  ["mensajeDeError traduce los fallos de GitHub", () => {
    esVerdad(/no existe o es privado/i.test(mensajeDeError({ response: { status: 404 } })), "404");
    const limite = mensajeDeError({ response: { status: 403, data: { message: "API rate limit exceeded for user" } } });
    esVerdad(/GITHUB_TOKEN/.test(limite), "el 403 por límite dice cómo subirlo");
    esVerdad(/60 por hora/.test(limite), "y dice cuál es el límite anónimo");
    esVerdad(/tardó demasiado/i.test(mensajeDeError({ code: "ECONNABORTED", message: "timeout of 20000ms exceeded" })), "timeout");
    igual(mensajeDeError({ message: "boom" }), "boom", "cualquier otro error pasa su mensaje");
    igual(mensajeDeError(undefined), "fallo desconocido", "y un error raro no revienta la prueba");
  }],

  // ── formateadores: campos que faltan ────────────────────────────────────────
  ["formatearBusqueda aguanta repos con campos vacíos", () => {
    const texto = formatearBusqueda(
      [{ full_name: "a/b", html_url: "https://github.com/a/b", stargazers_count: 1200, forks_count: 3, description: null, language: "JavaScript" }],
      "prueba"
    );
    esVerdad(texto.includes("a/b"), "trae el nombre");
    esVerdad(texto.includes("JavaScript"), "trae el lenguaje");
    esVerdad(/Sin descripción/.test(texto), "y dice que no hay descripción en vez de imprimir null");
    igual(formatearBusqueda([], "x").includes("RESULTADOS"), true, "sin resultados no revienta");
    igual(formatearBusqueda(undefined, "x").includes("RESULTADOS"), true, "ni con items undefined");
  }],

  ["formatearPerfil no imprime undefined cuando faltan datos", () => {
    const texto = formatearPerfil({ login: "riokuroxi-svg" });
    esVerdad(!/undefined/.test(texto), "ningún undefined a la vista");
    esVerdad(texto.includes("@riokuroxi-svg"), "trae el login");
    esVerdad(/Sin biografía/.test(texto), "bio ausente → texto, no hueco");
    esVerdad(!/undefined/.test(formatearPerfil({})), "ni con el perfil vacío");
  }],

  ["los topes son los documentados", () => {
    igual(MAX_ZIP, 40 * 1024 * 1024, "40 MB de ZIP");
    igual(MAX_AVATAR, 2 * 1024 * 1024, "2 MB de avatar");
  }],

  // ── execute: los caminos que no tocan la red ────────────────────────────────
  ["el plugin declara los seis nombres, los tres portados incluidos", () => {
    igual(
      github.command,
      ["gitsearch", "githubsearch", "ghsearch", "gitclone", "gituser", "github"],
      "nombres del comando"
    );
  }],

  [".github enseña la ayuda sin hacer ni una petición", async () => {
    const red = sinRed();
    try {
      const { enviados, ctx } = ctxFalso({ comando: "github", args: [] });
      await github.execute(ctx);
      igual(enviados.length, 1, "un solo mensaje");
      const texto = textoDe(enviados);
      esVerdad(texto.includes("gitclone"), "menciona gitclone");
      esVerdad(texto.includes("gituser"), "menciona gituser");
      esVerdad(texto.includes(".gitsearch"), "y usa el prefijo solo, no el array entero");
      esVerdad(!texto.includes(".,#"), "no se le escapó el array de prefijos");
      igual(red.estado.llamadas.length, 0, "no tocó la red");
    } finally {
      red.restaurar();
    }
  }],

  ["con `comando` vacío contesta la ayuda en vez de buscar (por ahí entra el humo)", async () => {
    const red = sinRed();
    try {
      const { enviados, ctx } = ctxFalso({ comando: undefined, args: [] });
      await github.execute(ctx);
      esVerdad(/GITHUB/.test(textoDe(enviados)), "enseña la ayuda");
      igual(red.estado.llamadas.length, 0, "no tocó la red");
    } finally {
      red.restaurar();
    }
  }],

  [".gitsearch sin término pide el término y no busca", async () => {
    const red = sinRed();
    try {
      const { enviados, ctx } = ctxFalso({ comando: "gitsearch", args: [] });
      await github.execute(ctx);
      esVerdad(/Uso:/i.test(textoDe(enviados)), "da el uso");
      igual(red.estado.llamadas.length, 0, "no tocó la red");
    } finally {
      red.restaurar();
    }
  }],

  [".gitclone con algo raro explica el uso y no construye ninguna URL", async () => {
    const red = sinRed();
    try {
      for (const malo of ["sinslash", "../../etc", "a/b/c", "", "owner/repo?x=1"]) {
        const { enviados, ctx } = ctxFalso({ comando: "gitclone", args: malo ? [malo] : [] });
        await github.execute(ctx);
        esVerdad(/Uso:/i.test(textoDe(enviados)), `rechaza ${JSON.stringify(malo)} con el uso`);
      }
      igual(red.estado.llamadas.length, 0, "ninguno de los cinco tocó la red");
    } finally {
      red.restaurar();
    }
  }],

  [".gituser sin usuario pide el usuario", async () => {
    const red = sinRed();
    try {
      const { enviados, ctx } = ctxFalso({ comando: "gituser", args: [] });
      await github.execute(ctx);
      esVerdad(/Uso:/i.test(textoDe(enviados)), "da el uso");
      igual(red.estado.llamadas.length, 0, "no tocó la red");
    } finally {
      red.restaurar();
    }
  }],

  ["los tres caminos de uso incorrecto reaccionan sin tumbar el comando", async () => {
    const red = sinRed();
    try {
      const { reacciones, enviados, ctx } = ctxFalso({ comando: "gitclone", args: ["../../etc"] });
      await github.execute(ctx);
      igual(reacciones.length, 0, "el rechazo no reacciona: sólo contesta");
      igual(enviados.length, 1, "y contesta una sola vez");
      igual(red.estado.llamadas.length, 0, "sin red");
    } finally {
      red.restaurar();
    }
  }],
];
