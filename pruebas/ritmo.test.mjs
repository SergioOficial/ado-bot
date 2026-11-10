/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * El ritmo humano: conversaciones nuevas, reloj y tecleo. Cada prueba fija una
 * regla que, si se rompe, convierte al bot en una tubería otra vez.
 */
import { igual, esVerdad } from "./ayuda.mjs";
import { curvaCircadiana, planDeEscritura, crearRitmo, NIVELES, nivelPedido } from "../lib/ritmo.js";
import { crearCola, envolverSocket, crearLimitador, crearSalud } from "../lib/antiban.js";

const AJUSTES = {
  activo: true,
  nuevosDia: 3,
  nuevosPrimerDia: 1,
  nuevosDiaTres: 2,
  diasDeRampa: 7,
  mensajesHora: 5,
  porChatHora: 3,
  calienteMin: 60,
  silencioDesde: 2,
  silencioHasta: 6,
  tecleoWpm: 45,
  tecleoMinMs: 700,
  tecleoMaxMs: 4000,
  presencia: true,
};

/** Un momento de hoy a la hora pedida (para no depender de la hora real). */
const aLas = (hora) => {
  const d = new Date();
  d.setHours(hora, 0, 0, 0);
  return d.getTime();
};

const AGUILA = "5215511111111@s.whatsapp.net";

export const pruebas = [
  // ── el reloj ────────────────────────────────────────────────────────────
  ["de madrugada la espera se estira, de día se acorta", () => {
    const noche = curvaCircadiana(3, AJUSTES);
    const dia = curvaCircadiana(15, AJUSTES);
    esVerdad(noche.factor > 2, `de madrugada mucho más lento (${noche.factor})`);
    esVerdad(dia.factor < 1, `de día más rápido (${dia.factor})`);
    esVerdad(noche.madrugada, "las 3 son madrugada");
    esVerdad(!dia.madrugada, "las 15 no");
  }],

  ["la curva no da saltos: horas vecinas se parecen", () => {
    for (let h = 0; h < 23; h++) {
      const a = curvaCircadiana(h, AJUSTES).factor;
      const b = curvaCircadiana(h + 1, AJUSTES).factor;
      esVerdad(Math.abs(a - b) < 0.9, `entre las ${h} y las ${h + 1} no hay escalón (${a} → ${b})`);
    }
  }],

  // ── el tecleo ───────────────────────────────────────────────────────────
  ["un texto largo tarda más en escribirse, pero tiene techo", () => {
    const corto = planDeEscritura("hola", AJUSTES).ms;
    const largo = planDeEscritura("x".repeat(400), AJUSTES).ms;
    const enorme = planDeEscritura("x".repeat(5000), AJUSTES).ms;
    esVerdad(largo > corto, "lo largo tarda más");
    igual(enorme, AJUSTES.tecleoMaxMs, "y nadie se queda 50 s escribiendo");
    esVerdad(corto >= AJUSTES.tecleoMinMs, "ni aparece y desaparece de golpe");
  }],

  // ── conversaciones nuevas ───────────────────────────────────────────────
  ["contestar a quien te escribió no gasta el cupo de conversaciones nuevas", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    ritmo.anotarEntrante(AGUILA, aLas(12));
    const r = ritmo.permite(AGUILA, { ahora: aLas(12) });
    esVerdad(r.ok, "se puede contestar");
    igual(ritmo.resumen(aLas(12)).nuevosHoy, 0, "no cuenta como conversación nueva");
  }],

  ["escribirle a un desconocido sí gasta cupo, y se acaba", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    const ahora = aLas(12);
    // El día 1 del rampeo: un chat nuevo.
    igual(ritmo.permite(AGUILA, { ahora }).ok, true, "el primero pasa");
    ritmo.anotarSalida(AGUILA, { ahora });
    igual(ritmo.resumen(ahora).nuevosHoy, 1, "queda apuntado");

    const otro = "5215522222222@s.whatsapp.net";
    const r = ritmo.permite(otro, { ahora });
    igual(r.ok, false, "el segundo ya no pasa");
    igual(r.motivo, "chats-nuevos", "y dice por qué");
  }],

  ["de madrugada no se abre conversación, pero sí se contesta", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    const tres = aLas(3);
    igual(ritmo.permite(AGUILA, { ahora: tres }).motivo, "madrugada", "frío: no");
    ritmo.anotarEntrante(AGUILA, tres);
    igual(ritmo.permite(AGUILA, { ahora: tres }).ok, true, "caliente: sí");
  }],

  ["lo urgente nunca se frena", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    const tres = aLas(3);
    igual(ritmo.permite("5215533333333@s.whatsapp.net", { ahora: tres, urgente: true }).ok, true, "pasa");
  }],

  ["nadie manda más de lo permitido en una hora ni en un chat", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    const ahora = aLas(12);
    ritmo.anotarEntrante(AGUILA, ahora);
    for (let i = 0; i < AJUSTES.porChatHora; i++) {
      igual(ritmo.permite(AGUILA, { ahora }).ok, true, `el mensaje ${i + 1} pasa`);
      ritmo.anotarSalida(AGUILA, { ahora });
    }
    const r = ritmo.permite(AGUILA, { ahora });
    igual(r.ok, false, "el siguiente ya no");
    igual(r.motivo, "por-chat", "porque es el mismo chat");
  }],

  ["la calidez se enfría con el tiempo", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    const antes = aLas(8);
    ritmo.anotarEntrante(AGUILA, antes);
    igual(ritmo.caliente(AGUILA, aLas(9)), true, "una hora después todavía");
    igual(ritmo.caliente(AGUILA, aLas(14)), false, "seis horas después ya no");
  }],

  ["el presupuesto vive en la base: reiniciar no lo resetea", () => {
    const estado = {};
    const uno = crearRitmo({ estado, ajustes: AJUSTES });
    uno.anotarEntrante(AGUILA, aLas(12));
    uno.anotarSalida(AGUILA, { ahora: aLas(12) });
    const dos = crearRitmo({ estado, ajustes: AJUSTES });
    igual(dos.resumen(aLas(12)).salidasHoy, 1, "el segundo proceso lo ve igual");
  }],

  // ── la cola y el tecleo, con un socket de mentira ───────────────────────
  ["el bot enciende el «escribiendo…» antes de mandar y lo apaga después", async () => {
    const presencia = [];
    const sock = {
      async sendMessage() {
        return { ok: true };
      },
      async relayMessage() {
        return { ok: true };
      },
      async sendPresenceUpdate(estado, jid) {
        presencia.push(`${estado}:${jid}`);
      },
    };
    const limitador = crearLimitador({ estado: {}, ajustes: { activo: true, baseMs: 1, minimoMs: 1, maximoMs: 2, circadiano: false } });
    const cola = crearCola({ limitador, salud: crearSalud() });
    const ritmo = crearRitmo({ estado: {}, ajustes: { ...AJUSTES, tecleoMinMs: 10, tecleoMaxMs: 20 } });
    const envuelto = envolverSocket(sock, { cola, ritmo });

    await envuelto.sendMessage(AGUILA, { text: "vale" });
    esVerdad(presencia.includes(`composing:${AGUILA}`), "enciende el tecleo");
    esVerdad(presencia.includes(`paused:${AGUILA}`), "y lo apaga al mandar");
  }],

  ["una reacción no enciende el tecleo (no se escribe nada)", async () => {
    const presencia = [];
    const sock = {
      async sendMessage() {
        return { ok: true };
      },
      async relayMessage() {
        return { ok: true };
      },
      async sendPresenceUpdate(e) {
        presencia.push(e);
      },
    };
    const limitador = crearLimitador({ estado: {}, ajustes: { activo: true, baseMs: 1, minimoMs: 1, maximoMs: 2, circadiano: false } });
    const cola = crearCola({ limitador });
    const ritmo = crearRitmo({ estado: {}, ajustes: AJUSTES });
    const envuelto = envolverSocket(sock, { cola, ritmo });
    await envuelto.sendMessage(AGUILA, { react: { text: "👍", key: {} } });
    igual(presencia.length, 0, "nada de tecleo");
  }],

  ["si el servidor no acepta la presencia, el mensaje sale igual", async () => {
    const sock = {
      enviados: 0,
      async sendMessage() {
        this.enviados += 1;
        return { ok: true };
      },
      async relayMessage() {
        return { ok: true };
      },
      async sendPresenceUpdate() {
        throw new Error("no soportado");
      },
    };
    const limitador = crearLimitador({ estado: {}, ajustes: { activo: true, baseMs: 1, minimoMs: 1, maximoMs: 2, circadiano: false } });
    const cola = crearCola({ limitador });
    const ritmo = crearRitmo({ estado: {}, ajustes: { ...AJUSTES, tecleoMinMs: 10, tecleoMaxMs: 20 } });
    const envuelto = envolverSocket(sock, { cola, ritmo });
    await envuelto.sendMessage(AGUILA, { text: "hola" });
    igual(sock.enviados, 1, "el mensaje salió");
  }],
];

// ── caudal, ráfagas y grupos ────────────────────────────────────────────────
pruebas.push(
  ["hay tres niveles de caudal y el normal es el tranquilo", () => {
    igual(NIVELES.normal.mensajesHora, 30, "normal");
    esVerdad(NIVELES.alto.mensajesHora > NIVELES.normal.mensajesHora, "alto sube");
    esVerdad(NIVELES.maximo.mensajesHora > NIVELES.alto.mensajesHora, "maximo más");
  }],

  ["un grupo pesa más que un chat privado", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: { ...AJUSTES, mensajesHora: 4, factorGrupo: 2, rafaga: 0 } });
    const ahora = aLas(12);
    ritmo.anotarEntrante("120363000000000000@g.us", ahora);
    ritmo.anotarSalida("120363000000000000@g.us", { ahora });
    // Una salida a grupo pesa 2: con límite 4, quedan 2.
    igual(ritmo.resumen(ahora).porHora, 1, "se cuenta la salida");
    const d = ritmo.permite("120363000000000000@g.us", { ahora });
    esVerdad(d.ok === true, "todavía cabe");
  }],

  ["la ráfaga deja mandar seguido y luego se corta", () => {
    const ritmo = crearRitmo({ estado: {}, ajustes: { ...AJUSTES, mensajesHora: 50, porChatHora: 50, rafaga: 3 } });
    const ahora = aLas(12);
    ritmo.anotarEntrante(AGUILA, ahora);
    const respuestas = [];
    for (let i = 0; i < 5; i++) {
      respuestas.push(ritmo.permite(AGUILA, { ahora }).ok);
      ritmo.anotarSalida(AGUILA, { ahora });
    }
    igual(respuestas.slice(0, 3), [true, true, true], "las tres primeras van seguidas");
  }],

  ["RITMO_NIVEL elige el caudal, y un nombre raro cae en normal", () => {
    const antes = process.env.RITMO_NIVEL;
    process.env.RITMO_NIVEL = "maximo";
    igual(nivelPedido(), "maximo", "se reconoce");
    process.env.RITMO_NIVEL = "modo-dios";
    igual(nivelPedido(), "normal", "lo que no existe cae en el seguro");
    if (antes === undefined) delete process.env.RITMO_NIVEL;
    else process.env.RITMO_NIVEL = antes;
  }]
);
