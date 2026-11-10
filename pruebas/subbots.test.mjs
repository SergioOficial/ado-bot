/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import fs from "fs";
import os from "os";
import path from "path";
import { igual, esVerdad } from "./ayuda.mjs";
import {
  pareceLid,
  numeroValido,
  rutaSesion,
  rutaConfig,
  estadoSesion,
  sesionesParaRestaurar,
  migrarSesionVieja,
  leerConfig,
  guardarConfig,
  borrarSesion,
} from "../lib/subbots.js";

/** Carpeta temporal con la forma `sub/SubBots`. */
function taller() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "levi-subbots-"));
  const sesiones = path.join(raiz, "sub", "SubBots");
  const configs = path.join(raiz, "sub", "SubConfigs");
  fs.mkdirSync(sesiones, { recursive: true });
  fs.mkdirSync(configs, { recursive: true });
  return { raiz, sesiones, configs };
}

function sesion(raiz, numero, registrada = true) {
  const carpeta = path.join(raiz, numero);
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, "creds.json"), JSON.stringify({ registered: registrada }), "utf8");
  return carpeta;
}

const LEER = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

export const pruebas = [
  ["un LID no sirve para pedir código, un teléfono sí", () => {
    esVerdad(pareceLid("123456789012345"), "15 dígitos con 1 delante");
    esVerdad(!pareceLid("5215574370309"), "el número del dueño no es un LID");
    igual(numeroValido("5215574370309"), true, "con lada");
    igual(numeroValido("5574370309"), true, "sin lada");
    igual(numeroValido("123456789012345"), false, "LID");
    igual(numeroValido("123"), false, "muy corto");
    igual(numeroValido(""), false, "vacío");
  }],

  ["la sesión y su configuración viven en la misma carpeta que se lee", () => {
    const { sesiones, configs } = taller();
    igual(path.basename(rutaSesion("5215574370309", sesiones)), "5215574370309", "carpeta por número");
    igual(path.basename(rutaConfig("5215574370309", configs)), "subconfig_5215574370309.json", "archivo por número");
    // El fallo original: se guardaba en `sub/<número>` y se buscaba en
    // `sub/SubBots/<número>`, así que `.bots` no veía nada.
    esVerdad(rutaSesion("5215574370309", sesiones).includes(path.join("sub", "SubBots")), "cuelga de sub/SubBots");
    esVerdad(!rutaSesion("5215574370309", sesiones).endsWith(path.join("sub", "5215574370309")), "no en la carpeta vieja");
  }],

  ["estado de una sesión: falta, a medias y vinculada", () => {
    const { sesiones } = taller();
    igual(estadoSesion("5215574370309", sesiones), { existe: false, registrada: false }, "sin carpeta");
    const carpeta = path.join(sesiones, "5215574370309");
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, "creds.json"), "{roto", "utf8");
    igual(estadoSesion("5215574370309", sesiones), { existe: true, registrada: false }, "creds roto no revienta");
    sesion(sesiones, "5215574370309", false);
    igual(estadoSesion("5215574370309", sesiones).registrada, false, "a medio vincular");
    sesion(sesiones, "5215574370309", true);
    igual(estadoSesion("5215574370309", sesiones).registrada, true, "vinculada");
  }],

  ["al arrancar vuelven solo las sesiones vinculadas", () => {
    const { sesiones } = taller();
    sesion(sesiones, "5215574370309", true);
    sesion(sesiones, "5354386852", true);
    sesion(sesiones, "573005255807", false);
    fs.writeFileSync(path.join(sesiones, "leeme.txt"), "no es una sesión", "utf8");
    igual(sesionesParaRestaurar(sesiones), ["5215574370309", "5354386852"], "solo las vinculadas, ordenadas");
    igual(sesionesParaRestaurar(path.join(sesiones, "no-existe")), [], "carpeta que no existe");
  }],

  ["una sesión vieja se mueve a su sitio y no se pisa nada", () => {
    const { raiz } = taller();
    const vieja = path.join(raiz, "sub", "5215574370309");
    fs.mkdirSync(vieja, { recursive: true });
    fs.writeFileSync(path.join(vieja, "creds.json"), JSON.stringify({ registered: true }), "utf8");

    const r = migrarSesionVieja("5215574370309", { raiz });
    igual(r.movida, true, "se movió");
    esVerdad(fs.existsSync(path.join(raiz, "sub", "SubBots", "5215574370309", "creds.json")), "quedó en SubBots");
    esVerdad(!fs.existsSync(vieja), "la carpeta vieja ya no está");

    igual(migrarSesionVieja("5215574370309", { raiz }).movida, false, "la segunda vez no hay nada que mover");
    // Con el destino ocupado no se pisa: se deja como está y se dice.
    const otra = taller();
    fs.mkdirSync(path.join(otra.raiz, "sub", "5354386852"), { recursive: true });
    fs.writeFileSync(path.join(otra.raiz, "sub", "5354386852", "creds.json"), "{}", "utf8");
    sesion(otra.sesiones, "5354386852", true);
    const choque = migrarSesionVieja("5354386852", { raiz: otra.raiz });
    igual(choque.movida, false, "no se pisa");
    igual(choque.motivo, "el destino ya existe", "y lo dice");
  }],

  ["configuración del sub-bot: se guarda, se lee y sobrevive a un json roto", () => {
    const { configs } = taller();
    igual(leerConfig("5215574370309", configs), { owners: [] }, "sin archivo");
    guardarConfig("5215574370309", { owners: ["5574370309"] }, configs);
    igual(leerConfig("5215574370309", configs).owners, ["5574370309"], "vuelve tal cual");
    fs.writeFileSync(rutaConfig("5215574370309", configs), "{roto", "utf8");
    igual(leerConfig("5215574370309", configs), { owners: [] }, "json roto no revienta");
  }],

  ["borrar la sesión la borra de verdad (y dice si había algo)", () => {
    const { sesiones } = taller();
    sesion(sesiones, "5215574370309", true);
    igual(borrarSesion("5215574370309", sesiones), true, "había algo");
    esVerdad(!fs.existsSync(path.join(sesiones, "5215574370309")), "borrada");
    igual(borrarSesion("5215574370309", sesiones), false, "ya no hay nada");
  }],

  ["index.js usa las rutas nuevas y restaura los sub-bots al arrancar", () => {
    const fuente = LEER("index.js");
    // El fallo original, escrito tal cual, no puede volver.
    esVerdad(!fuente.includes("`./sub/${phoneNumber}`"), "nada de sub/<número> a mano");
    esVerdad(fuente.includes("rutaSesion(phoneNumber)"), "la sesión sale de lib/subbots.js");
    esVerdad(fuente.includes("migrarSesionVieja"), "las sesiones viejas se migran");
    esVerdad(fuente.includes("restaurarSubbots"), "y se restauran al conectar");
    esVerdad(fuente.includes("numeroValido(phoneNumber)"), "el número se valida en un solo sitio");
  }],
];
