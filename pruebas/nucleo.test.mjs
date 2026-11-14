/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL.
 *
 * pruebas/nucleo.test.mjs — que el núcleo arranque, de verdad.
 *
 * `node --check` solo ve la sintaxis: el bloque anti-bucle roto de `index.js`
 * compilaba línea por línea y aun así el archivo no cargaba. Esta prueba importa
 * los módulos del arranque y comprueba que existen y exponen lo que los plugins
 * esperan. No abre WhatsApp ni toca la red; solo carga.
 *
 * Es la red que faltaba: si alguien vuelve a dejar el núcleo a medio escribir,
 * esto falla en el CI antes de que falle en el teléfono.
 */
import fs from "fs";
import { igual, esVerdad } from "./ayuda.mjs";

const LEER = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

export const pruebas = [
  ["index.js carga y es un punto de entrada fino", async () => {
    const fuente = LEER("index.js");
    esVerdad(fuente.includes("./boot/arranque.js"), "importa el arranque real");
    esVerdad(fuente.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).length < 12, "y no lleva lógica dentro");
  }],

  ["boot/arranque.js importa y expone lo suyo", async () => {
    const nucleo = await import("../boot/arranque.js");
    esVerdad(typeof nucleo.arrancar === "function", "arrancar");
    esVerdad(typeof nucleo.autorReal === "function", "autorReal");
    esVerdad(typeof nucleo.esDueno === "function", "esDueno");
    esVerdad(typeof nucleo.objetivoDelMensaje === "function", "objetivoDelMensaje");
    esVerdad(nucleo.COMANDOS_URGENTES instanceof Set, "COMANDOS_URGENTES");
    esVerdad(nucleo.COMANDOS_URGENTES.has("menu"), "menu es urgente");
    esVerdad(typeof nucleo.antibanEncendido === "function", "antibanEncendido");
  }],

  ["las piezas del núcleo cargan todas", async () => {
    const modulos = [
      ["../boot/router.js", ["crearRouter", "numeroDe"]],
      ["../boot/subbots.js", ["crearGestorSubbots", "esperaDeReintento", "decideReintento"]],
      ["../boot/vigilantes.js", ["vigilarRecordatorios", "vigilarMemoria", "prepararAntiban"]],
      ["../boot/anti-cuelgue.js", ["instalarAntiCuelgue", "esErrorDeRed"]],
      ["../lib/compuerta.js", ["compuerta", "textoDelMensaje", "esMensajePropio"]],
      ["../lib/bucles.js", ["crearGuardaBucles", "huellaDe"]],
    ];
    for (const [ruta, esperados] of modulos) {
      const m = await import(ruta);
      for (const nombre of esperados) {
        esVerdad(typeof m[nombre] === "function", `${ruta} exporta ${nombre}`);
      }
    }
  }],

  ["autorReal prefiere un teléfono antes que un LID", async () => {
    const { autorReal } = await import("../boot/arranque.js");
    igual(
      autorReal({ key: { remoteJid: "120363@g.us", participant: "5215512345678@s.whatsapp.net" } }),
      "5215512345678@s.whatsapp.net",
      "en grupo toma al participante"
    );
    igual(
      autorReal({ key: { remoteJid: "5215512345678@s.whatsapp.net" } }),
      "5215512345678@s.whatsapp.net",
      "en privado toma el chat"
    );
    // participantPn es el teléfono real cuando el participante viene como LID.
    igual(
      autorReal({
        key: {
          remoteJid: "120363@g.us",
          participant: "123456789012345@lid",
          participantPn: "5215599999999@s.whatsapp.net",
        },
      }),
      "5215599999999@s.whatsapp.net",
      "resuelve el LID al teléfono"
    );
    igual(autorReal({}), undefined, "sin key no inventa nada");
  }],

  ["esDueno reconoce a los owners de config.js", async () => {
    const { esDueno } = await import("../boot/arranque.js");
    const { config } = await import("../config.js");
    const primero = config.owners[0].number;
    esVerdad(esDueno(`${primero}@s.whatsapp.net`, { user: { id: "0:1@s.whatsapp.net" } }), "el primer owner");
    esVerdad(esDueno(`${primero}:12@s.whatsapp.net`, {}), "con dispositivo sigue siendo él");
    igual(esDueno("5215500000000@s.whatsapp.net", {}), false, "un desconocido no");
    esVerdad(esDueno("0:1@s.whatsapp.net", { user: { id: "0:1@s.whatsapp.net" } }), "el propio bot es dueño de sí");
  }],

  ["objetivoDelMensaje saca al mencionado o al citado", async () => {
    const { objetivoDelMensaje } = await import("../boot/arranque.js");
    igual(
      objetivoDelMensaje({ message: { extendedTextMessage: { contextInfo: { mentionedJid: ["a@s.whatsapp.net"] } } } }),
      { jid: "a@s.whatsapp.net" },
      "mencionado"
    );
    igual(
      objetivoDelMensaje({ message: { extendedTextMessage: { contextInfo: { participant: "b@s.whatsapp.net" } } } }),
      { jid: "b@s.whatsapp.net" },
      "citado"
    );
    igual(
      objetivoDelMensaje({ message: {} }, ["5358090650"]),
      { jid: "5358090650@s.whatsapp.net" },
      "número en el argumento"
    );
    igual(objetivoDelMensaje({ message: {} }, []), { jid: null }, "sin objetivo");
    igual(objetivoDelMensaje(null, null).jid, null, "con basura no lanza");
  }],

  ["el anti-ban sigue apagado si no se pide", async () => {
    const { antibanEncendido } = await import("../boot/arranque.js");
    const anterior = process.env.ANTIBAN;
    try {
      delete process.env.ANTIBAN;
      igual(antibanEncendido(), false, "sin variable, apagado");
      process.env.ANTIBAN = "off";
      igual(antibanEncendido(), false, "off explícito");
      process.env.ANTIBAN = "on";
      igual(antibanEncendido(), true, "on lo enciende");
      process.env.ANTIBAN = "1";
      igual(antibanEncendido(), true, "1 también");
    } finally {
      if (anterior === undefined) delete process.env.ANTIBAN;
      else process.env.ANTIBAN = anterior;
    }
  }],

  ["los errores de red se filtran y los de código no", async () => {
    const { esErrorDeRed } = await import("../boot/anti-cuelgue.js");
    esVerdad(esErrorDeRed({ code: "ECONNRESET" }), "ECONNRESET");
    esVerdad(esErrorDeRed({ message: "socket hang up" }), "socket hang up");
    esVerdad(esErrorDeRed({ cause: { code: "ETIMEDOUT" } }), "viene en cause");
    igual(esErrorDeRed(new TypeError("no existe la cosa")), false, "un fallo de código no es red");
    igual(esErrorDeRed(null), false, "nulo");
  }],

  ["ningún plugin importa el cliente de WhatsApp por su cuenta", () => {
    // lib/baileys.js es el único sitio que decide qué paquete se usa. Si un
    // plugin importa el paquete directamente, ese comando se queda atado al
    // oficial aunque el bot corra con el fork (le pasaba a .tourl).
    function recorrer(dir, salida = []) {
      for (const nombre of fs.readdirSync(dir)) {
        if (nombre === "node_modules" || nombre === ".git") continue;
        const ruta = `${dir}/${nombre}`;
        if (fs.statSync(ruta).isDirectory()) recorrer(ruta, salida);
        else if (nombre.endsWith(".js")) salida.push(ruta);
      }
      return salida;
    }
    const raiz = new URL("../", import.meta.url).pathname;
    const culpables = recorrer(`${raiz}plugins`)
      .concat(recorrer(`${raiz}boot`))
      .filter((ruta) =>
        /from\s*["']@(whiskeysockets|itsliaaa)\/baileys["']/.test(LEER(ruta.replace(raiz, "")))
      );
    igual(culpables, [], "todos pasan por lib/baileys.js");
  }],

  ["las rutas de datos salen de lib/rutas.js", async () => {
    const rutas = await import("../lib/rutas.js");
    for (const nombre of ["SESION_PRINCIPAL", "SUB_SESIONES", "SUB_CONFIGS", "BASE_DATOS", "TEMPORAL"]) {
      esVerdad(typeof rutas[nombre] === "string" && rutas[nombre].length > 0, `${nombre} es una ruta`);
      esVerdad(!rutas[nombre].startsWith("./"), `${nombre} es absoluta (no depende de dónde se arrancó)`);
    }
    esVerdad(Array.isArray(rutas.numerosDeSubSesiones()), "numerosDeSubSesiones devuelve una lista");
    esVerdad(rutas.BASE_DATOS.endsWith("database.json"), "la base sigue en su sitio");
    esVerdad(rutas.SUB_SESIONES.includes("SubBots"), "y los sub-bots en el suyo");
  }],

  ["ningún plugin vuelve a escribir la carpeta de datos a mano", () => {
    // `.bots` llegó a buscar en una carpeta distinta de la que index.js creaba, y
    // por eso la lista salía siempre con un solo bot. La prueba es que no vuelva.
    function recorrer(dir, salida = []) {
      for (const nombre of fs.readdirSync(dir)) {
        if (nombre === "node_modules" || nombre === ".git") continue;
        const ruta = `${dir}/${nombre}`;
        if (fs.statSync(ruta).isDirectory()) recorrer(ruta, salida);
        else if (nombre.endsWith(".js")) salida.push(ruta);
      }
      return salida;
    }
    const raiz = new URL("../", import.meta.url).pathname;
    const culpables = [];
    for (const archivo of recorrer(`${raiz}plugins`).concat(recorrer(`${raiz}boot`))) {
      const relativo = archivo.replace(raiz, "");
      const fuente = LEER(relativo);
      if (/["'`]\.\/(sub\/SubBots|sub\/SubConfigs|session|tmp)["'`]/.test(fuente)) culpables.push(relativo);
    }
    igual(culpables, [], "todos usan lib/rutas.js");
  }],
];
