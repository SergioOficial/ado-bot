/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import {
  crearLimitador,
  crearCola,
  crearSalud,
  crearVigilante,
  envolverSocket,
  gaussiana,
  esFalloDeConexion,
  CODIGO_INCIERTO,
  PERFILES,
  AVISO_VETERANO,
} from "../lib/antiban.js";

/** Ajustes rápidos para que las pruebas no esperen segundos de verdad. */
// `circadiano: false` para que las pruebas no dependan de la hora del servidor:
// el multiplicador nocturno es real, pero aquí se mide otra cosa.
const RAPIDO = {
  activo: true,
  baseMs: 5,
  minimoMs: 1,
  maximoMs: 10,
  diasCalentamiento: 7,
  inicioMsgsDia: 2,
  maxMsgsDia: 5,
  circadiano: false,
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export const pruebas = [
  ["el jitter es una campana alrededor de la media", () => {
    let suma = 0;
    let dentro = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const x = gaussiana(1000, 250);
      suma += x;
      if (Math.abs(x - 1000) <= 750) dentro++;
    }
    const media = suma / N;
    esVerdad(Math.abs(media - 1000) < 40, `media cerca de 1000 (salió ${media.toFixed(1)})`);
    esVerdad(dentro / N > 0.99, "más del 99 % cae a ±3σ");
  }],

  ["la espera respeta mínimo y máximo, y las urgentes van al mínimo", () => {
    const l = crearLimitador({ estado: {}, ajustes: RAPIDO });
    for (let i = 0; i < 200; i++) {
      const ms = l.demora({ largo: 50 });
      esVerdad(ms >= RAPIDO.minimoMs && ms <= RAPIDO.maximoMs, `dentro de rango (${ms})`);
    }
    igual(l.demora({ urgente: true, largo: 400 }), RAPIDO.minimoMs, "urgente");
  }],

  ["los textos largos esperan más que los cortos", () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, baseMs: 0, minimoMs: 0, maximoMs: 5000 } });
    const corto = l.demora({ largo: 5 });
    const largo = l.demora({ largo: 400 });
    esVerdad(largo > corto, `largo (${largo}) > corto (${corto})`);
    igual(largo, 2000, "el añadido por longitud tiene techo de 2 s");
  }],

  ["ANTIBAN=off no espera nada", () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, activo: false } });
    igual(l.demora({ largo: 1000 }), 0, "sin espera");
    esVerdad(l.puedeEnviar(), "sin tope");
  }],

  ["el tope diario sube con los días y se puede gastar", () => {
    const hace3 = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const estado = { inicio: hace3, ultimoDia: new Date().toISOString().slice(0, 10), msgsHoy: 0 };
    const l = crearLimitador({ estado, ajustes: RAPIDO });

    const r = l.resumen();
    igual(r.dia, 4, "cuarto día de calentamiento");
    // 2 + (5-2) * 3/7 = 3,28 → 3 mensajes hoy
    igual(r.tope, 3, "el tope sube poco a poco");
    esVerdad(l.puedeEnviar(), "queda cuota");

    for (let i = 0; i < 4; i++) l.anotarEnvio();
    igual(l.puedeEnviar(), false, "tope alcanzado");
    igual(estado.total, 4, "se cuentan los envíos");
  }],

  ["al octavo día ya no hay calentamiento", () => {
    const hace10 = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const l = crearLimitador({ estado: { inicio: hace10, ultimoDia: hace10, msgsHoy: 0 }, ajustes: RAPIDO });
    const r = l.resumen();
    igual(r.terminado, true, "terminado");
    igual(r.tope, RAPIDO.maxMsgsDia, "tope máximo");
  }],

  ["el contador diario se reinicia al cambiar el día", () => {
    const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const estado = { inicio: ayer, ultimoDia: ayer, msgsHoy: 5 };
    const l = crearLimitador({ estado, ajustes: RAPIDO });
    igual(l.resumen().msgsHoy, 0, "vuelve a cero");
    igual(estado.ultimoDia, new Date().toISOString().slice(0, 10), "apunta el día nuevo");
  }],

  ["el riesgo suma desconexiones, errores, fallos de envío y el 403", () => {
    const s = crearSalud();
    igual(s.riesgo(), 0, "sin eventos");

    for (let i = 0; i < 3; i++) s.anotarDesconexion();
    igual(s.riesgo(), 30, "3 desconexiones = 30 (y ahí topa)");

    for (let i = 0; i < 8; i++) s.anotarError(new Error("x"));
    igual(s.riesgo(), 60, "8 errores = +30 (topa)");

    const con403 = crearSalud();
    con403.anotarError({ output: { statusCode: 403 } });
    igual(con403.riesgo(), 15, "un error = 5, y el 403 añade 10");

    const fallos = crearSalud();
    fallos.anotarEnvio();
    fallos.anotarEnvio();
    fallos.anotarEnvioFallido(new Error("x"));
    fallos.anotarEnvioFallido(new Error("x"));
    igual(fallos.riesgo(), 30, "2 de 3 fallidos = +30 (topa)");
    igual(fallos.estado().nivel, "moderado", "nivel");
  }],

  ["la cola envía en orden, de una en una", async () => {
    // Sin tope diario: aquí se mide el orden, no el calentamiento.
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, inicioMsgsDia: 1000, maxMsgsDia: 1000 } });
    const cola = crearCola({ limitador: l, registro: {}, esperaTopeMs: 10 });
    const hechos = [];
    const tareas = [1, 2, 3].map((n) =>
      cola.encolar(async () => {
        await dormir(3);
        hechos.push(n);
        return n;
      })
    );
    igual(await Promise.all(tareas), [1, 2, 3], "resultados en orden");
    igual(hechos, [1, 2, 3], "se ejecutaron en orden");
  }],

  ["con el tope alcanzado, las reacciones pasan y los mensajes esperan", async () => {
    const estado = { inicio: new Date().toISOString().slice(0, 10), ultimoDia: new Date().toISOString().slice(0, 10), msgsHoy: 99 };
    const l = crearLimitador({ estado, ajustes: RAPIDO });
    const cola = crearCola({ limitador: l, registro: {}, esperaTopeMs: 20 });

    esVerdad(!l.puedeEnviar(), "tope alcanzado");

    const orden = [];
    cola.encolar(async () => orden.push("mensaje"), {}); // normal: se queda esperando
    const reaccion = cola.encolar(async () => orden.push("reaccion"), { countsForQuota: false });
    await reaccion;

    igual(orden, ["reaccion"], "la reacción salió primero");
    esVerdad(cola.largo() >= 1, "el mensaje sigue en cola");
    cola.limpiar();
  }],

  ["las urgentes se adelantan al tope", async () => {
    const estado = { inicio: new Date().toISOString().slice(0, 10), ultimoDia: new Date().toISOString().slice(0, 10), msgsHoy: 99 };
    const l = crearLimitador({ estado, ajustes: RAPIDO });
    const cola = crearCola({ limitador: l, registro: {}, esperaTopeMs: 20 });

    const orden = [];
    cola.encolar(async () => orden.push("normal"), {});
    await cola.encolar(async () => orden.push("urgente"), { isPriority: true });

    igual(orden, ["urgente"], "la urgente saltó");
    cola.limpiar();
  }],

  ["un envío sin respuesta NO se repite", async () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, inicioMsgsDia: 1000, maxMsgsDia: 1000 } });
    const cola = crearCola({ limitador: l, registro: {}, plazoMs: 30 });
    let intentos = 0;

    const promesa = cola.encolar(async () => {
      intentos += 1;
      await dormir(200); // nunca contesta a tiempo
    });

    let error = null;
    try {
      await promesa;
    } catch (e) {
      error = e;
    }
    igual(intentos, 1, "un solo intento");
    igual(error?.code, CODIGO_INCIERTO, "se marca como incógnita");
    igual(cola.estado().inciertos, 1, "queda anotado");
  }],

  ["si se cae la conexión, el mensaje espera y sale al volver", async () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, inicioMsgsDia: 1000, maxMsgsDia: 1000 } });
    const cola = crearCola({ limitador: l, registro: {}, esperaConexionMs: 2000 });
    cola.pausar("conexion");

    let enviado = false;
    const promesa = cola.encolar(async () => {
      enviado = true;
      return "ok";
    });

    await dormir(30);
    igual(enviado, false, "no sale mientras está pausada");

    cola.reanudar("conexion");
    igual(await promesa, "ok", "sale al reanudar");
    igual(enviado, true, "enviado");
  }],

  ["las pausas se acumulan por motivo: una no anula la otra", () => {
    const cola = crearCola({ limitador: crearLimitador({ estado: {}, ajustes: RAPIDO }), registro: {} });
    cola.pausar("conexion");
    cola.pausar("riesgo");

    cola.reanudar("conexion");
    igual(cola.pausada(), true, "sigue parada por riesgo");
    igual(cola.motivos(), ["riesgo"], "quedan los motivos");

    cola.reanudar("riesgo");
    igual(cola.pausada(), false, "libre");
  }],

  ["los fallos de conexión se reconocen y las incógnitas no", () => {
    esVerdad(esFalloDeConexion(new Error("Connection Closed")), "Connection Closed");
    esVerdad(esFalloDeConexion(new Error("socket is not open")), "socket cerrado");
    esVerdad(!esFalloDeConexion({ code: CODIGO_INCIERTO, message: "Connection Closed" }), "incógnita no es caída");
    esVerdad(!esFalloDeConexion(new Error("403 Forbidden")), "403 no es transitorio");
    esVerdad(!esFalloDeConexion(null), "null");
  }],

  ["envolverSocket manda todo por la cola y distingue lo liviano", async () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, inicioMsgsDia: 1000, maxMsgsDia: 1000 } });
    const cola = crearCola({ limitador: l, registro: {}, esperaTopeMs: 10 });
    const vistos = [];
    const falso = {
      sendMessage: async (jid, contenido) => {
        vistos.push(contenido);
        return { key: { id: `id-${vistos.length}` } };
      },
      relayMessage: async () => "relay-ok",
    };

    envolverSocket(falso, { cola });

    await falso.sendMessage("a@s", { text: "hola" });
    await falso.sendMessage("a@s", { react: { text: "✅", key: {} } });
    igual(await falso.relayMessage("a@s", { a: 1 }, {}), "relay-ok", "relay pasa por la cola");
    igual(vistos.length, 2, "los dos sendMessage llegaron");
    // Cuentan el texto y el relay; la reacción no (es lo que se comprueba).
    igual(l.resumen().msgsHoy, 2, "la reacción no gasta cuota");

    envolverSocket(falso, { cola }); // envolver dos veces no debe duplicar
    await falso.sendMessage("a@s", { text: "otra vez" });
    igual(vistos.length, 3, "una sola envoltura");
  }],

  ["el vigilante pausa con riesgo alto y reanuda al bajar", () => {
    const cola = crearCola({ limitador: crearLimitador({ estado: {}, ajustes: RAPIDO }), registro: {} });
    const salud = crearSalud();
    const vigilante = crearVigilante({ cola, salud, obtenerSock: () => null, registro: {} });

    // 3 desconexiones (30) + 6 errores (30) + 1 envío fallido de 1 (30) = 90
    for (let i = 0; i < 3; i++) salud.anotarDesconexion();
    for (let i = 0; i < 6; i++) salud.anotarError(new Error("x"));
    salud.anotarEnvio();
    salud.anotarEnvioFallido(new Error("x"));
    esVerdad(salud.riesgo() >= 80, `riesgo alto (${salud.riesgo()})`);

    vigilante.revisar();
    igual(cola.pausada(), true, "cola en pausa");
    igual(vigilante.estado().pausadoPorRiesgo, true, "lo sabe");

    // Se limpia el historial (equivale a que pasen las horas sin fallos).
    salud.eventos.length = 0;
    vigilante.revisar();
    igual(cola.pausada(), false, "reanudada");
    igual(vigilante.estado().pausadoPorRiesgo, false, "lo sabe");
  }],

  ["el vigilante no reconecta sin socket abierto ni en bucle", () => {
    const cola = crearCola({ limitador: crearLimitador({ estado: {}, ajustes: RAPIDO }), registro: {} });
    const salud = crearSalud();
    let cerrados = 0;
    const sock = { ws: { ready: true, close: () => { cerrados += 1; } } };

    const vigilante = crearVigilante({
      cola,
      salud,
      obtenerSock: () => sock,
      registro: {},
      sinSenalMs: -1,       // cualquier silencio cuenta, aunque sea de 0 ms
      enfriamientoMs: 60_000,
      maxIntentos: 3,
    });

    vigilante.revisar();
    vigilante.revisar();
    vigilante.revisar();
    igual(cerrados, 1, "el enfriamiento impide reconectar en cadena");
  }],
];

// ── Menú: guía, crédito y marcas ─────────────────────────────────────────────
import { LEYENDA, CREDITO, marcar, marcaDe } from "../lib/menu-ayuda.js";
import { botonesActivos, desarmar } from "../lib/botones.js";

pruebas.push(
  ["la guía y el crédito son los de Shin-MD, tal cual", () => {
    esVerdad(LEYENDA.includes("Ⓓ Dueño • Ⓟ Premium • Ⓐ Admin"), "renglón de símbolos");
    esVerdad(LEYENDA.includes("Ⓖ Grupos • Ⓛ Límite"), "grupos y límite");
    esVerdad(LEYENDA.includes("〔 🔖 GUÍA RÁPIDA 〕"), "título");
    esVerdad(CREDITO.includes("Shin-MD · Bot de WhatsApp Profesional"), "nombre");
    esVerdad(CREDITO.includes("github.com/riokuroxi-svg/Shin-MD"), "repo");
    esVerdad(CREDITO.includes("https://whatsapp.com/channel/0029Vb0VFpSGJP89hfZUe522"), "canal");
  }],

  ["las marcas salen de los plugins, no de una lista a mano", () => {
    const mapa = new Map([
      ["exec", { isOwner: true }],
      ["kick", { isAdmin: true }],
      ["canjear", { isPremium: true }],
      ["ping", {}],
    ]);
    igual(marcaDe(mapa.get("exec")), "Ⓓ", "dueño");
    igual(marcaDe(mapa.get("kick")), "Ⓐ", "admin");
    igual(marcaDe(mapa.get("canjear")), "Ⓟ", "premium");
    igual(marcaDe(mapa.get("ping")), "", "sin bandera, sin marca");

    const texto = marcar(".exec | .kick | .canjear | .ping", ".", mapa);
    igual(texto, "Ⓓ .exec | Ⓐ .kick | Ⓟ .canjear | .ping", "marcado");
  }],

  ["«menu» no se marca dentro de «menucat»", () => {
    const mapa = new Map([
      ["menu", { isOwner: false }],
      ["menucat", { isOwner: true }],
    ]);
    igual(marcar(".menucat y .menu", ".", mapa), "Ⓓ .menucat y .menu", "el largo primero");
  }],

  ["los botones se pueden apagar con BOTONES=off", () => {
    const antes = process.env.BOTONES;
    delete process.env.BOTONES;
    igual(botonesActivos(), true, "por defecto sí");
    process.env.BOTONES = "off";
    igual(botonesActivos(), false, "apagados");
    process.env.BOTONES = "0";
    igual(botonesActivos(), false, "cero");
    if (antes === undefined) delete process.env.BOTONES;
    else process.env.BOTONES = antes;
  }],

  ["desarmar deja texto y enlace para el respaldo", () => {
    const lista = desarmar([
      { buttonParamsJson: JSON.stringify({ display_text: "Uno", id: "1" }) },
      { buttonParamsJson: JSON.stringify({ display_text: "Dos", url: "https://x.y" }) },
      { buttonParamsJson: "roto" },
    ]);
    igual(lista, [{ texto: "Uno", url: null }, { texto: "Dos", url: "https://x.y" }, { texto: "opción", url: null }], "armado");
  }]
);

// ── perfiles de calentamiento ───────────────────────────────────────────────
// `veterano` quita la rampa de días: el tope máximo desde el primer día. Estas
// pruebas fijan que sea eso y nada más: no apaga la espera ni el resto.
pruebas.push(
  ["el perfil veterano da el tope máximo el primer día", () => {
    const l = crearLimitador({
      estado: {},
      ajustes: { ...RAPIDO, perfil: "veterano" },
    });
    const r = l.resumen();
    igual(r.perfil, "veterano", "perfil");
    igual(r.tope, RAPIDO.maxMsgsDia, "tope desde el día 1");
    esVerdad(r.terminado, "la rampa se da por terminada");
  }],

  ["el perfil auto sigue subiendo con los días", () => {
    const hace3 = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const l = crearLimitador({
      estado: { inicio: hace3 },
      ajustes: { ...RAPIDO, perfil: "auto", diasCalentamiento: 7, inicioMsgsDia: 2, maxMsgsDia: 5 },
    });
    const r = l.resumen();
    esVerdad(r.tope > RAPIDO.inicioMsgsDia && r.tope < RAPIDO.maxMsgsDia, `tope intermedio (${r.tope})`);
    esVerdad(!r.terminado, "todavía en rampa");
  }],

  ["el perfil cambia en caliente y gana sobre el entorno", () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, perfil: "auto" } });
    igual(l.resumen().tope, RAPIDO.inicioMsgsDia, "empieza por el tope del día 1");
    const cambio = l.cambiarPerfil("veterano");
    igual(cambio, { antes: "auto", ahora: "veterano" }, "el cambio se cuenta");
    igual(l.resumen().tope, RAPIDO.maxMsgsDia, "ya con el tope máximo");
    // Se guarda en el estado que va a la base: otro limitador con ese estado lo ve.
    const otro = crearLimitador({ estado: l.estado, ajustes: { ...RAPIDO, perfil: "auto" } });
    igual(otro.resumen().perfil, "veterano", "sobrevive a reiniciar");
  }],

  ["un perfil que no existe no cambia nada", () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, perfil: "auto" } });
    igual(l.cambiarPerfil("modo-dios"), null, "se rechaza");
    igual(l.resumen().perfil, "auto", "se queda como estaba");
  }],

  ["el perfil veterano no quita la espera entre envíos", () => {
    const l = crearLimitador({ estado: {}, ajustes: { ...RAPIDO, perfil: "veterano" } });
    for (let i = 0; i < 50; i++) {
      const ms = l.demora({ largo: 20 });
      esVerdad(ms >= RAPIDO.minimoMs && ms <= RAPIDO.maximoMs, `sigue esperando (${ms})`);
    }
  }],

  ["el aviso del perfil veterano dice lo que arriesgas", () => {
    esVerdad(AVISO_VETERANO.includes("veterano"), "se identifica");
    esVerdad(/arriesgas/i.test(AVISO_VETERANO), "habla del riesgo");
    esVerdad(/número nuevo/i.test(AVISO_VETERANO), "avisa del número nuevo");
  }]
);
