/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { resolverRuta } from "../plugins/owner/subir.js";
import { decidirReinicio } from "../plugins/owner/restart.js";
import { legible } from "../plugins/owner/evaluar.js";
import { planAlbum, asociarAlAlbum, buildAlbumParent, MIN_ALBUM, MAX_ALBUM } from "../lib/album.js";

const RAIZ = "/tmp/bot-de-prueba";

export const pruebas = [
  ["álbum: revisa la lista antes de gastar envíos", () => {
    igual(planAlbum([]).error, "vacio", "vacío");
    igual(planAlbum(["https://x.y/1.jpg"]).error, "pocos", "una sola foto");
    igual(planAlbum(Array.from({ length: MAX_ALBUM + 1 }, () => "https://x.y/a.jpg")).error, "muchos", "demasiadas");
    igual(planAlbum([null, null]).error, "tipo", "sin imagen");

    const plan = planAlbum([
      "https://x.y/1.jpg",
      { image: "https://x.y/2.jpg", caption: "dos" },
      { video: Buffer.from("x") },
    ]);
    igual(plan.ok, true, "válido");
    igual(plan.imagenes, 2, "dos imágenes");
    igual(plan.videos, 1, "un vídeo");
    igual(plan.medios[1].caption, "dos", "conserva la leyenda");
    igual(MIN_ALBUM, 2, "mínimo del álbum");
  }],

  ["álbum: el padre dice cuántas piezas vienen y el hijo cuelga de él", () => {
    const plan = planAlbum(["https://x.y/1.jpg", "https://x.y/2.jpg"]);
    const padre = buildAlbumParent(plan);
    igual(padre.albumMessage.expectedImageCount, 2, "cuenta de imágenes");
    igual(padre.albumMessage.expectedVideoCount, 0, "cuenta de vídeos");

    const hijo = { imageMessage: {} };
    asociarAlAlbum(hijo, { id: "ABC", remoteJid: "x@g.us" });
    igual(hijo.messageContextInfo.messageAssociation.associationType, 1, "tipo álbum");
    igual(hijo.messageContextInfo.messageAssociation.parentMessageKey.id, "ABC", "apunta al padre");

    let fallo = null;
    try {
      asociarAlAlbum(hijo, {});
    } catch (e) {
      fallo = e.message;
    }
    igual(fallo, "falta la clave del mensaje padre", "sin padre no se cuelga");
  }],

  ["subir: la ruta nunca sale de la carpeta del bot", () => {
    igual(resolverRuta(RAIZ, "notas.txt").ok, true, "archivo normal");
    igual(resolverRuta(RAIZ, "plugins/utils/x.js").relativa, path.join("plugins", "utils", "x.js"), "dentro de plugins");
    igual(resolverRuta(RAIZ, "../../etc/passwd").ok, false, "escape con ..");
    igual(resolverRuta(RAIZ, "/etc/passwd").ok, false, "ruta absoluta");
    igual(resolverRuta(RAIZ, ".git/config").ok, false, ".git protegido");
    igual(resolverRuta(RAIZ, ".git").ok, false, ".git a secas");
    igual(resolverRuta(RAIZ, "").ok, false, "sin ruta");
    esVerdad(resolverRuta(RAIZ, "a\0b").ok === false, "byte nulo");
  }],

  ["reiniciar: elige el camino según quién sostiene el bot", () => {
    igual(decidirReinicio({ haySupervisor: true, hayVigia: true }), "ipc", "con supervisor");
    igual(decidirReinicio({ haySupervisor: false, hayVigia: true }), "relevo", "sin supervisor pero con vigía");
    igual(decidirReinicio({ haySupervisor: false, hayVigia: false }), "sin-salida", "instalación vieja");
  }],

  ["eval: el resultado se puede leer en un chat", () => {
    igual(legible("hola"), "hola", "texto tal cual");
    igual(legible(42), "42", "número");
    igual(legible({ a: 1 }), '{\n  "a": 1\n}', "objeto formateado");
    igual(legible(new Error("rompió")), "Error: rompió", "error");
    const circular = {};
    circular.yo = circular;
    esVerdad(legible(circular).includes("Circular") || legible(circular).length > 0, "no revienta con circular");
    esVerdad(legible("x".repeat(4000)).includes("recortado"), "recorta lo enorme");
  }],

  ["el vigía y el supervisor existen y no revientan al cargarse", async () => {
    esVerdad(fs.existsSync(path.join(process.cwd(), "scripts", "vigia.mjs")), "scripts/vigia.mjs");
    const { crearSupervisor, VENTANA_MS, MAX_CAIDAS } = await import("../scripts/supervisor.mjs");
    igual(typeof crearSupervisor, "function", "crearSupervisor");
    igual(MAX_CAIDAS, 5, "cinco caídas y se rinde");
    esVerdad(VENTANA_MS > 0, "ventana de tiempo");
  }],
];
