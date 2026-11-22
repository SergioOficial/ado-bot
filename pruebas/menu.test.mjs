/** riokuroxi — https://github.com/riokuroxi-svg · Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { catalogo, buscarCategoria, tituloDe, CATEGORIAS } from "../lib/menu-ayuda.js";
import { descripcionDe } from "../lib/descripciones.js";

/** Un plugin de mentira, con la misma forma que los de verdad. */
const plugin = (command, carpeta, extra = {}) => ({ command, carpeta, ...extra });

/** Un mapa de comandos como el que arma pluginLoader. */
function mapa(lista) {
  const m = new Map();
  for (const p of lista) for (const c of p.command) m.set(c.toLowerCase(), p);
  return m;
}

const ECONOMIA = [
  plugin(["work", "w", "trabajar"], "economia"),
  plugin(["daily"], "economia"),
  plugin(["bal", "balance"], "economia"),
];
const MASCOTAS = [plugin(["adoptar"], "rpg"), plugin(["pelear", "atacar", "capturar"], "rpg")];
const RPG = [plugin(["cazar"], "rpg"), plugin(["minar"], "rpg"), plugin(["trabajar2"], "rpg")];
const RARO = [plugin(["inventado"], "carpeta-nueva")];

export const pruebas = [
  [
    "el menú agrupa por carpeta y no repite un plugin con varios nombres",
    () => {
      const grupos = catalogo(mapa([...ECONOMIA, ...MASCOTAS, ...RPG]));
      const eco = grupos.find((g) => g.titulo === "Economía");
      igual(eco.comandos.length, 3, "tres plugins de economía, no cinco nombres");
      igual(eco.comandos[0].nombre, "bal");
      igual(eco.comandos[0].alias.join(","), "balance");
    },
  ],
  [
    "Mascotas se separa de RPG sin quedarse sin comandos",
    () => {
      const grupos = catalogo(mapa([...MASCOTAS, ...RPG]));
      const mascotas = grupos.find((g) => g.titulo === "Mascotas");
      const rpg = grupos.find((g) => g.titulo === "RPG");
      esVerdad(Boolean(mascotas) && Boolean(rpg), "tienen que existir las dos");
      igual(mascotas.comandos.map((c) => c.nombre).sort().join(","), "adoptar,pelear");
      esVerdad(!rpg.comandos.some((c) => c.nombre === "adoptar"), "adoptar no puede estar en RPG");
      esVerdad(rpg.comandos.some((c) => c.nombre === "cazar"), "cazar sí es de RPG");
    },
  ],
  [
    "un comando declarado por dos archivos sale una sola vez",
    () => {
      const grupos = catalogo(
        mapa([
          plugin(["ppt"], "economia"),
          plugin(["ppt", "piedra"], "economia"),
          plugin(["dice"], "economia"),
        ])
      );
      const eco = grupos.find((g) => g.titulo === "Economía");
      igual(eco.comandos.filter((c) => c.nombre === "ppt").length, 1);
    },
  ],
  [
    "los comandos del propio menú no se listan como si fueran del bot",
    () => {
      const grupos = catalogo(
        mapa([plugin(["menu", "help"], "info"), plugin(["ping"], "info")]),
        new Set(["menu", "help"])
      );
      const info = grupos.find((g) => g.titulo === "Info");
      igual(info.comandos.map((c) => c.nombre).join(","), "ping");
    },
  ],
  [
    "una carpeta desconocida no desaparece: sale al final con su nombre",
    () => {
      const grupos = catalogo(mapa([...ECONOMIA, ...RARO]));
      const raro = grupos.find((g) => g.carpeta === "carpeta-nueva");
      esVerdad(Boolean(raro), "la carpeta nueva tiene que salir");
      igual(raro.comandos.length, 1);
      igual(grupos[grupos.length - 1].carpeta, "carpeta-nueva", "y va al final");
    },
  ],
  [
    "buscar categoría aguanta acentos, mayúsculas y el nombre de carpeta",
    () => {
      const grupos = catalogo(mapa([...ECONOMIA, ...MASCOTAS, ...RPG]));
      igual(buscarCategoria(grupos, "ECONOMIA")?.titulo, "Economía");
      igual(buscarCategoria(grupos, "economía")?.titulo, "Economía");
      igual(buscarCategoria(grupos, "mascotas")?.titulo, "Mascotas");
      igual(buscarCategoria(grupos, "no-existe"), null);
      igual(buscarCategoria(grupos, ""), null);
    },
  ],
  [
    "todas las categorías tienen título y emoji, también las de reserva",
    () => {
      for (const c of CATEGORIAS) {
        esVerdad(Boolean(c.titulo && c.emoji), `categoría sin título o emoji: ${c.carpeta}`);
      }
      const inventada = tituloDe("loquesea");
      igual(inventada.titulo, "Loquesea");
      igual(inventada.emoji, "📁");
    },
  ],
  [
    "un comando sin ficha no rompe el menú: solo se queda sin frase",
    () => {
      igual(descripcionDe("work"), "Trabajar para ganar coins.");
      igual(descripcionDe("comando-inventado"), null);
      igual(descripcionDe(""), null);
      igual(descripcionDe(undefined), null);
    },
  ],
];
