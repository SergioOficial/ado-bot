/**
 * plugins/rpg/pelea.js — peleas de mascotas por turnos, con botones.
 *
 * CÓMO SE JUEGA
 * -------------
 *   .pelear                busca una mascota salvaje del tamaño de la tuya
 *   .pelear @alguien       reta a otro entrenador (los dos tienen que tener pets)
 *   .atacar 1 | 2 | 3      el ataque de ese número, el que ofrecen los botones
 *   .cambiar               saca a otra mascota del equipo (cuesta el turno)
 *   .huir                  te retiras de la pelea
 *   .capturar              te llevas a la salvaje cuando está por debajo del 40 %
 *   .petactivo <mascota>   elige cuál sale primero la próxima vez
 *
 * POR QUÉ LOS BOTONES MANDAN COMANDOS Y NO «CALLBACKS»
 * ----------------------------------------------------
 * El router de `index.js` convertía hace tiempo la pulsación de un botón en el
 * texto de su id, y ese texto entra como un comando normal. Así que el id de
 * cada botón es el comando completo (`atacar 2`, `cambiar zorro`): si el móvil
 * no pinta la tarjeta, el respaldo en texto que arma `lib/botones.js` deja los
 * mismos comandos escritos y la pelea se puede terminar igual.
 *
 * DÓNDE VIVE LA PELEA
 * -------------------
 * En `db.chats[from].pelea`, una sola por chat. No hace falta una lista: dos
 * peleas a la vez en el mismo grupo son dos personas escribiendo `.atacar`
 * esperando que el bot adivine de cuál hablan. Cuando alguien quiere otra, la
 * anterior se cierra sola o se avisa que sigue viva (20 minutos sin tocar y
 * caduca).
 */

import { enviarConBotones, rapido, lista } from "../../lib/botones.js";
import { dinero } from "../../lib/economia.js";

// ── reglas ──────────────────────────────────────────────────────────────────

/** Minutos que aguanta una pelea abandonada antes de cerrarse sola. */
const MINUTOS_DE_VIDA = 20;

/** Puntos de vida de una mascota según su nivel. */
function vidaMaxima(nivel) {
  return 55 + Math.max(1, Number(nivel) || 1) * 9;
}

/** Tipo de cada especie. Lo que no esté en la lista pega neutro. */
const TIPO_DE = {
  // las de `.adoptar`
  rana: "agua",
  sirena: "agua",
  "araña": "sombra",
  unicornio: "luz",
  hipogrifo: "aire",
  dragon: "fuego",
  gato: "normal",
  perro: "normal",
  zorro: "normal",
  lobo: "normal",
  caballo: "tierra",
  cerdo: "tierra",
  dinosaurio: "tierra",
  hada: "luz",
  duende: "sombra",
  slime: "agua",
  loro: "aire",
  cacatua: "aire",
  fenix: "fuego",
  quimera: "fuego",
  lechuza: "aire",
  leviatan: "agua",
  oso: "tierra",
  // las que se cazan
  godzilla: "fuego",
  megalodon: "agua",
  leon: "normal",
  alce: "tierra",
  "ñandu": "aire",
  jabali: "tierra",
  conejo: "normal",
  cucaracha: "sombra",
};

/** Tres ataques por tipo: barato y seguro, medio, y caro que falla más. */
const ATAQUES = {
  fuego: [
    { nombre: "Ascua", poder: 10, precision: 98 },
    { nombre: "Colmillo ígneo", poder: 16, precision: 85 },
    { nombre: "Llamarada", poder: 25, precision: 64 },
  ],
  agua: [
    { nombre: "Burbuja", poder: 10, precision: 98 },
    { nombre: "Chorro", poder: 16, precision: 85 },
    { nombre: "Maremoto", poder: 25, precision: 64 },
  ],
  planta: [
    { nombre: "Látigo cepa", poder: 10, precision: 98 },
    { nombre: "Hoja afilada", poder: 16, precision: 85 },
    { nombre: "Rayo solar", poder: 25, precision: 64 },
  ],
  tierra: [
    { nombre: "Bofetada de lodo", poder: 10, precision: 98 },
    { nombre: "Terremoto", poder: 17, precision: 82 },
    { nombre: "Falla geológica", poder: 25, precision: 63 },
  ],
  aire: [
    { nombre: "Aletazo", poder: 10, precision: 98 },
    { nombre: "Torbellino", poder: 16, precision: 86 },
    { nombre: "Ciclón", poder: 25, precision: 65 },
  ],
  luz: [
    { nombre: "Destello", poder: 10, precision: 99 },
    { nombre: "Rayo prismático", poder: 17, precision: 84 },
    { nombre: "Juicio", poder: 25, precision: 62 },
  ],
  sombra: [
    { nombre: "Arañazo oscuro", poder: 10, precision: 98 },
    { nombre: "Mordida sombría", poder: 16, precision: 85 },
    { nombre: "Abismo", poder: 26, precision: 60 },
  ],
  normal: [
    { nombre: "Placaje", poder: 10, precision: 99 },
    { nombre: "Mordisco", poder: 16, precision: 85 },
    { nombre: "Embestida", poder: 24, precision: 66 },
  ],
};

/**
 * Tabla de eficacia: `EFICAZ[atacante][defensor]`.
 *
 * 1.5 es «le pega fuerte», 0.6 «casi no le hace nada» y lo que no esté es
 * neutro. Se mantiene corta a propósito: una tabla enorme no se nota jugando,
 * pero sí a la hora de cuadrarla.
 */
const EFICAZ = {
  fuego: { planta: 1.5, aire: 1.25, agua: 0.6, tierra: 0.7, fuego: 0.8 },
  agua: { fuego: 1.5, tierra: 1.4, planta: 0.6, agua: 0.8 },
  planta: { agua: 1.5, tierra: 1.4, fuego: 0.6, aire: 0.7 },
  tierra: { fuego: 1.4, aire: 1.25, agua: 0.6, planta: 0.7 },
  aire: { planta: 1.5, tierra: 1.3, fuego: 0.8, sombra: 0.9 },
  luz: { sombra: 1.5, normal: 1.15, luz: 0.7 },
  sombra: { luz: 0.6, normal: 1.25, sombra: 0.8 },
  normal: { normal: 1 },
};

/** Bichos que salen en la hierba alta (nunca los de `.adoptar`). */
const SALVAJES = ["jabali", "conejo", "ñandu", "alce", "cucaracha", "leon", "megalodon", "godzilla"];

// ── ayudas ──────────────────────────────────────────────────────────────────

function tipoDe(clave) {
  return TIPO_DE[String(clave || "").toLowerCase()] || "normal";
}

function ataquesDe(clave) {
  return ATAQUES[tipoDe(clave)] || ATAQUES.normal;
}

function eficacia(tipoAtacante, tipoDefensor) {
  return EFICAZ[tipoAtacante]?.[tipoDefensor] ?? 1;
}

function nombreDe(db, jid) {
  const u = db.users?.[jid];
  return u?.nombre || u?.name || String(jid || "").split("@")[0];
}

function barra(actual, total, ancho = 10) {
  const lleno = Math.max(0, Math.min(ancho, Math.round((actual / Math.max(1, total)) * ancho)));
  return "▰".repeat(lleno) + "▱".repeat(ancho - lleno);
}

/** «zorro» o «Zorrito»: las dos formas valen para hablar de una mascota. */
function buscarMascota(user, buscado) {
  const objetivo = String(buscado || "").trim().toLowerCase();
  if (!objetivo || !user?.pets) return null;
  for (const [clave, pet] of Object.entries(user.pets)) {
    if (clave.toLowerCase() === objetivo) return { clave, pet };
    if (String(pet?.name || "").toLowerCase() === objetivo) return { clave, pet };
  }
  // Último intento: que empiece igual («zor» → zorro).
  for (const [clave, pet] of Object.entries(user.pets)) {
    if (clave.toLowerCase().startsWith(objetivo)) return { clave, pet };
    if (String(pet?.name || "").toLowerCase().startsWith(objetivo)) return { clave, pet };
  }
  return null;
}

/** La mascota que representa al jugador: la elegida con `.petactivo` o la primera. */
function mascotaActiva(user) {
  if (!user?.pets) return null;
  const claves = Object.keys(user.pets);
  if (!claves.length) return null;
  if (user.petActivo && user.pets[user.petActivo]) {
    return { clave: user.petActivo, pet: user.pets[user.petActivo] };
  }
  return { clave: claves[0], pet: user.pets[claves[0]] };
}

/** Sube de nivel lo que haya que subir. Devuelve `true` si subió. */
function subirNivel(pet) {
  let subio = false;
  while (pet.points >= pet.level * 100 && pet.level < 50) {
    pet.points -= pet.level * 100;
    pet.level++;
    subio = true;
  }
  return subio;
}

/** Un lado de la pelea, ya con la vida llena. */
function crearLado(jid, clave, pet) {
  const nivel = Math.max(1, Number(pet?.level) || 1);
  return {
    jid: jid || null,
    clave,
    nombre: pet?.name || clave,
    nivel,
    hp: vidaMaxima(nivel),
    hpMax: vidaMaxima(nivel),
  };
}

function ladoVivo(lado) {
  return Boolean(lado && lado.hp > 0);
}

/** La pelea se cerró sola por abandono. */
function caducada(pelea) {
  return Date.now() - (pelea?.creada || 0) > MINUTOS_DE_VIDA * 60 * 1000;
}

// ── textos ──────────────────────────────────────────────────────────────────

function marcador(pelea, db) {
  const fila = (lado, marca) => {
    const quien = lado.jid ? nombreDe(db, lado.jid) : "Salvaje";
    const vida = `${barra(lado.hp, lado.hpMax)} ${Math.max(0, lado.hp)}/${lado.hpMax}`;
    return `${marca} *${lado.nombre}* (${tipoDe(lado.clave)} Nv.${lado.nivel}) — ${quien}\n   ${vida}`;
  };
  return `${fila(pelea.a, "🟦")}\n${fila(pelea.b, "🟥")}`;
}

const PIE = "Las peleas no quitan vida de verdad: al terminar, la mascota queda como estaba.";

// ── envío del tablero con botones ───────────────────────────────────────────

/**
 * Manda el estado de la pelea con las opciones del que le toca.
 *
 * Los botones son siempre tres (o cuatro si hay `.capturar` disponible): la
 * lista de ataques y las dos salidas. WhatsApp dibuja tres sin desplegar nada;
 * con cuatro, `lib/botones.js` pide la hoja inferior solo.
 */
async function enviarTablero(ctx, pelea, extra = "") {
  const { sock, from, m, db, enviartexto } = ctx;

  const tuya = pelea.turno === "a" ? pelea.a : pelea.b;
  const suya = pelea.turno === "a" ? pelea.b : pelea.a;

  const titulo = tuya.jid
    ? `🎮 Turno de *${nombreDe(db, tuya.jid)}*`
    : "🎮 Turno de la mascota salvaje";

  const texto = `${marcador(pelea, db)}\n\n${titulo}${extra ? `\n${extra}` : ""}`;

  const botones = [];
  if (tuya.jid) {
    const ataques = ataquesDe(tuya.clave);
    botones.push(
      lista(
        "⚔️ Elegir ataque",
        [
          {
            title: `Ataques de ${tuya.nombre}`,
            rows: ataques.map((a, i) => ({
              id: `atacar ${i + 1}`,
              title: `${i + 1}. ${a.nombre}`,
              description: `Poder ${a.poder} · Precisión ${a.precision}%`,
            })),
          },
        ],
      ),
    );

    // Capturar solo contra salvajes y cuando está débil: si no, es un botón
    // que siempre contesta «todavía no».
    if (pelea.tipo === "salvaje" && pelea.b.hp > 0 && pelea.b.hp <= pelea.b.hpMax * 0.4) {
      botones.push(rapido("🔮 Capturar", "capturar"));
    }

    botones.push(rapido("🔄 Cambiar", "cambiar"));
    botones.push(rapido("🏃 Huir", "huir"));
  }

  await enviarConBotones(sock, from, {
    texto,
    botones,
    cita: m,
    pie: PIE,
  }).catch(() => enviartexto(texto));

  return pelea;
}

// ── fin de la pelea: premios y limpieza ─────────────────────────────────────

function cerrar(ctx, mensaje) {
  const { db, from } = ctx;
  const chat = db.chats[from];
  if (chat?.pelea) chat.pelea = null;
  return mensaje;
}

/** Reparte monedas y puntos al ganador humano y deja la mascota como estaba. */
function premiar(ctx, lado, puntosExtra = 0) {
  const { db } = ctx;
  const user = db.users[lado.jid];
  if (!user?.pets?.[lado.clave]) return { coins: 0, puntos: 0, subio: false };

  const pet = user.pets[lado.clave];
  const coins = Math.floor(400 + lado.nivel * 120 + puntosExtra);
  const puntos = 20 + lado.nivel * 5;

  user.coins = (Number(user.coins) || 0) + coins;
  user.peleasGanadas = (Number(user.peleasGanadas) || 0) + 1;
  pet.points = (Number(pet.points) || 0) + puntos;
  const subio = subirNivel(pet);

  return { coins, puntos, subio };
}

// ── acciones ────────────────────────────────────────────────────────────────

async function iniciarPelea(ctx) {
  const { sender, args, db, from, enviartexto, getTargetFromMsg, PREFIX } = ctx;
  const chat = db.chats[from];
  const user = db.users[sender];

  const mia = mascotaActiva(user);
  if (!mia) {
    return enviartexto(
      `🐾 No tienes ninguna mascota para pelear.\n> Consigue una con *${PREFIX}adoptar dragon* o cazando con *${PREFIX}cazar*.`,
    );
  }

  if (chat.pelea && !caducada(chat.pelea)) {
    // Ya hay una: en vez de otra, se muestra la que está viva.
    return enviarTablero(ctx, chat.pelea, "\n> Ya hay una pelea en este chat.");
  }

  const { jid: retado } = getTargetFromMsg(ctx.m, args);
  const esDuelo = Boolean(retado && retado !== sender);

  if (esDuelo) {
    const rival = db.users[retado];
    const suya = mascotaActiva(rival);
    if (!suya) {
      return enviartexto(`❌ *${nombreDe(db, retado)}* todavía no tiene mascotas.`);
    }
    chat.pelea = {
      tipo: "duelo",
      creada: Date.now(),
      turno: "a",
      rondas: 0,
      a: crearLado(sender, mia.clave, mia.pet),
      b: crearLado(retado, suya.clave, suya.pet),
    };
    await enviarTablero(
      ctx,
      chat.pelea,
      `\n⚡ *${nombreDe(db, sender)}* retó a *${nombreDe(db, retado)}*`,
    );
    return;
  }

  // Salvaje: del tamaño de la tuya, para que la pelea no sea un trámite ni una
  // paliza. Nunca sale por debajo de 1 ni por encima de 50.
  const clave = SALVAJES[Math.floor(Math.random() * SALVAJES.length)];
  const nivel = Math.max(1, Math.min(50, mia.pet.level + Math.floor(Math.random() * 3) - 1));
  chat.pelea = {
    tipo: "salvaje",
    creada: Date.now(),
    turno: "a",
    rondas: 0,
    a: crearLado(sender, mia.clave, mia.pet),
    b: crearLado(null, clave, { name: clave.charAt(0).toUpperCase() + clave.slice(1), level: nivel }),
  };

  await enviarTablero(ctx, chat.pelea, `\n🌿 ¡Apareció un/una *${chat.pelea.b.nombre}* salvaje!`);
}

/** Golpe de un lado contra el otro. Devuelve el texto de la ronda. */
function golpear(atacante, defensor, indice) {
  const ataques = ataquesDe(atacante.clave);
  const ataque = ataques[Math.max(0, Math.min(ataques.length - 1, indice))];

  if (Math.random() * 100 > ataque.precision) {
    return { texto: `💨 *${atacante.nombre}* falló ${ataque.nombre}.`, dano: 0 };
  }

  const tipoA = tipoDe(atacante.clave);
  const tipoD = tipoDe(defensor.clave);
  const multi = eficacia(tipoA, tipoD);
  const variacion = 0.85 + Math.random() * 0.3;
  const dano = Math.max(1, Math.round((ataque.poder + atacante.nivel * 1.2) * variacion * multi));

  defensor.hp = Math.max(0, defensor.hp - dano);

  let texto = `💥 *${atacante.nombre}* usa *${ataque.nombre}*: -${dano} PS`;
  if (multi >= 1.4) texto += " — ¡Es muy eficaz!";
  if (multi <= 0.7) texto += " — No es muy eficaz…";

  return { texto, dano };
}

/** El salvaje responde solo, con el ataque que más le conviene. */
function turnoDelSalvaje(pelea) {
  const indice = pelea.b.hp < pelea.b.hpMax * 0.4 ? 1 : Math.random() < 0.35 ? 2 : 0;
  return golpear(pelea.b, pelea.a, indice);
}

/** Cambia la mascota del que tiene el turno sin gastar más que el turno. */
function cambiarLado(pelea, lado, clave, pet) {
  const nuevo = crearLado(lado.jid, clave, pet);
  if (pelea.turno === "a") pelea.a = nuevo;
  else pelea.b = nuevo;
  return nuevo;
}

/** ¿Le quedan mascotas con vida a este jugador? */
function equipoVivo(user, excluir) {
  if (!user?.pets) return [];
  return Object.entries(user.pets)
    .filter(([clave]) => clave !== excluir)
    .map(([clave, pet]) => ({ clave, pet }));
}

async function atacar(ctx, indice) {
  const { sender, db, from, enviartexto, PREFIX } = ctx;
  const chat = db.chats[from];
  const pelea = chat.pelea;

  if (!pelea) {
    return enviartexto(`⚔️ No hay ninguna pelea abierta.\n> Empieza una con *${PREFIX}pelear* o *${PREFIX}pelear @alguien*.`);
  }
  if (caducada(pelea)) {
    cerrar(ctx, "");
    return enviartexto("⌛ La pelea se enfrió por falta de movimiento. Empieza otra cuando quieras.");
  }

  const soyA = pelea.a.jid === sender;
  const soyB = pelea.b.jid === sender;
  if (!soyA && !soyB) {
    return enviartexto("👀 Esta pelea no es tuya: espera a que termine o reta a alguien.");
  }
  const miLado = soyA ? "a" : "b";
  if (pelea.turno !== miLado) {
    const otro = pelea.turno === "a" ? pelea.a : pelea.b;
    return enviartexto(`⏳ Todavía no es tu turno: le toca a *${otro.jid ? nombreDe(db, otro.jid) : "la salvaje"}*.`);
  }

  const atacante = pelea[miLado];
  const contrario = miLado === "a" ? "b" : "a";
  const defensor = pelea[contrario];

  const { texto } = golpear(atacante, defensor, indice);
  pelea.rondas = (pelea.rondas || 0) + 1;

  let extra = `\n${texto}`;

  // 1. Cayó el rival.
  if (defensor.hp <= 0) {
    // Duelo y el rival tiene más mascotas: sale la siguiente sola, sin frenar
    // la pelea pidiendo otro comando.
    const rivalUser = defensor.jid ? db.users[defensor.jid] : null;
    const reserva = rivalUser ? equipoVivo(rivalUser, defensor.clave) : [];
    if (reserva.length) {
      const siguiente = reserva[0];
      if (contrario === "b") pelea.b = crearLado(defensor.jid, siguiente.clave, siguiente.pet);
      else pelea.a = crearLado(defensor.jid, siguiente.clave, siguiente.pet);
      pelea.turno = contrario;
      return enviarTablero(
        ctx,
        pelea,
        `${extra}\n\n😵 *${defensor.nombre}* no puede más.\n➡️ Entra *${siguiente.pet.name || siguiente.clave}*.`,
      );
    }

    // Sin reservas: se acabó.
    const premio = defensor.jid === null ? premiar(ctx, atacante) : premiar(ctx, atacante, 400);
    cerrar(ctx, "");
    const ganador = atacante.jid ? nombreDe(db, atacante.jid) : "la salvaje";
    let final = `🏆 *${ganador}* gana la pelea.\n${extra}`;
    if (atacante.jid) {
      final += `\n\n💰 *+${dinero(premio.coins)}* · ✨ *+${premio.puntos}* puntos para *${atacante.nombre}*`;
      if (premio.subio) final += `\n🎉 *¡${atacante.nombre} subió de nivel!*`;
    }
    return enviartexto(final);
  }

  // 2. La pelea sigue.
  if (pelea.tipo === "salvaje") {
    const vuelta = turnoDelSalvaje(pelea);
    extra += `\n${vuelta.texto}`;
    if (pelea.a.hp <= 0) {
      cerrar(ctx, "");
      return enviartexto(
        `💀 *${pelea.a.nombre}* se quedó sin fuerzas.\n${extra}\n\n> No pasa nada: vuelve a intentarlo con *${PREFIX}pelear*.`,
      );
    }
    pelea.turno = "a";
  } else {
    pelea.turno = contrario;
  }

  return enviarTablero(ctx, pelea, extra);
}

async function cambiar(ctx, buscado) {
  const { sender, args, db, from, enviartexto, sock, m, PREFIX } = ctx;
  const chat = db.chats[from];
  const pelea = chat.pelea;

  if (!pelea) {
    return enviartexto(`⚔️ No hay ninguna pelea abierta.\n> Empieza una con *${PREFIX}pelear*.`);
  }

  const soyA = pelea.a.jid === sender;
  const soyB = pelea.b.jid === sender;
  if (!soyA && !soyB) return enviartexto("👀 Esta pelea no es tuya.");
  const miLado = soyA ? "a" : "b";
  if (pelea.turno !== miLado) return enviartexto("⏳ Espera tu turno para cambiar de mascota.");

  const user = db.users[sender];
  const actual = pelea[miLado];
  const opciones = equipoVivo(user, actual.clave);

  // Sin argumento: se ofrece el equipo con botones en vez de una lista a mano.
  if (!buscado) {
    if (!opciones.length) {
      return enviartexto(`🐾 *${actual.nombre}* es la única que te queda. Sigue peleando.`);
    }
    const botones = [
      lista("🔄 Sacar a otra", [
        {
          title: "Tu equipo",
          rows: opciones.slice(0, 9).map(({ clave, pet }) => ({
            id: `cambiar ${clave}`,
            title: pet.name || clave,
            description: `${tipoDe(clave)} · Nv.${pet.level || 1}`,
          })),
        },
      ]),
      rapido("↩️ Seguir peleando", "pelea"),
    ];
    if (pelea.tipo === "salvaje" && pelea.b.hp <= pelea.b.hpMax * 0.4) {
      botones.push(rapido("🔮 Capturar", "capturar"));
    }
    return enviarConBotones(sock, from, {
      texto: `${marcador(pelea, db)}\n\n🔄 *¿A quién sacas?* Cambiar gasta el turno.`,
      botones,
      cita: m,
      pie: PIE,
    }).catch(() => enviartexto("🔄 Escribe el nombre de la mascota: " + PREFIX + "cambiar zorro"));
  }

  const encontrada = buscarMascota(user, buscado);
  if (!encontrada) return enviartexto("❌ No tienes esa mascota.");
  if (encontrada.clave === actual.clave) return enviartexto(`🐾 *${actual.nombre}* ya está en la pelea.`);
  if (pelea[miLado === "a" ? "b" : "a"].hp > 0 && encontrada.clave === pelea[miLado === "a" ? "b" : "a"].clave) {
    return enviartexto("❌ Esa la está usando el rival.");
  }

  const nuevo = cambiarLado(pelea, actual, encontrada.clave, encontrada.pet);

  // Cambiar también gasta el turno: es lo que evita cambiar a cada golpe.
  if (pelea.tipo === "salvaje") {
    const vuelta = turnoDelSalvaje(pelea);
    if (pelea.a.hp <= 0) {
      cerrar(ctx, "");
      return enviartexto(
        `💀 *${nuevo.nombre}* no aguantó la entrada.\n${vuelta.texto}\n\n> Prueba otra vez con *${PREFIX}pelear*.`,
      );
    }
    return enviarTablero(ctx, pelea, `\n🔄 Entra *${nuevo.nombre}*.\n${vuelta.texto}`);
  }

  pelea.turno = miLado === "a" ? "b" : "a";
  return enviarTablero(ctx, pelea, `\n🔄 Entra *${nuevo.nombre}*.`);
}

async function huir(ctx) {
  const { sender, db, from, enviartexto, PREFIX } = ctx;
  const chat = db.chats[from];
  const pelea = chat.pelea;

  if (!pelea) return enviartexto(`⚔️ No hay ninguna pelea abierta.\n> Empieza una con *${PREFIX}pelear*.`);

  const soyA = pelea.a.jid === sender;
  const soyB = pelea.b.jid === sender;
  if (!soyA && !soyB) return enviartexto("👀 Esta pelea no es tuya.");

  const mia = soyA ? pelea.a : pelea.b;
  const rival = soyA ? pelea.b : pelea.a;
  cerrar(ctx, "");

  // En un duelo, huir es perder: se dice claro, sin adornos.
  const quien = rival.jid ? nombreDe(db, rival.jid) : "la salvaje";
  return enviartexto(`🏃 *${mia.nombre}* se retira. Gana *${quien}*.\n> Sin premios para nadie: la huida no cuenta como victoria.`);
}

async function capturar(ctx) {
  const { sender, db, from, enviartexto, PREFIX } = ctx;
  const chat = db.chats[from];
  const pelea = chat.pelea;

  if (!pelea) return enviartexto(`⚔️ No hay ninguna pelea abierta.\n> Empieza una con *${PREFIX}pelear*.`);
  if (pelea.tipo !== "salvaje") return enviartexto("❌ Solo se captura a las salvajes.");
  if (pelea.a.jid !== sender) return enviartexto("👀 Esta pelea no es tuya.");
  if (pelea.b.hp > pelea.b.hpMax * 0.4) {
    return enviartexto("🔮 Todavía está muy entera: bájale más de la mitad de la vida antes de tirar la captura.");
  }

  const user = db.users[sender];
  const clave = pelea.b.clave;
  // Cuanto más débil, mejor entra: 45 % con toda la vida que permite el umbral,
  // hasta 85 % al borde de caer.
  const proporcion = pelea.b.hp / Math.max(1, pelea.b.hpMax);
  const exito = Math.random() < 0.85 - proporcion * 0.9;

  if (!exito) {
    pelea.turno = "a";
    const vuelta = turnoDelSalvaje(pelea);
    if (pelea.a.hp <= 0) {
      cerrar(ctx, "");
      return enviartexto(`💀 Se escapó y *${pelea.a.nombre}* cayó en el intento.\n${vuelta.texto}`);
    }
    return enviarTablero(ctx, pelea, `\n🔮 Se soltó de la captura.\n${vuelta.texto}`);
  }

  cerrar(ctx, "");
  if (!user.pets) user.pets = {};
  let mensaje;
  if (user.pets[clave]) {
    const pet = user.pets[clave];
    pet.points = (Number(pet.points) || 0) + 40;
    const subio = subirNivel(pet);
    mensaje = `🔮 ¡Atrapado! Como ya tenías un/una *${clave}*, *${pet.name}* recibió *+40* puntos.`;
    if (subio) mensaje += `\n🎉 *¡Subió al nivel ${pet.level}!*`;
  } else {
    user.pets[clave] = {
      name: clave.charAt(0).toUpperCase() + clave.slice(1),
      level: pelea.b.nivel,
      points: 0,
      lastPet: 0,
      lastFeed: 0,
      lastWalk: 0,
      lastRename: 0,
    };
    mensaje = `🔮 ¡Capturado! *${user.pets[clave].name}* (Nv.${pelea.b.nivel}) ya es parte de tu equipo.\n> Míralo con *${PREFIX}animal*.`;
  }

  const premio = premiar(ctx, pelea.a);
  return enviartexto(`${mensaje}\n\n💰 *+${dinero(premio.coins)}* por la captura.`);
}

// ── plugin ──────────────────────────────────────────────────────────────────

export default {
  command: [
    "pelear",
    "pelea",
    "batalla",
    "retar",
    "atacar",
    "cambiar",
    "huir",
    "capturar",
    "petactivo",
  ],

  execute: async (ctx) => {
    const { sender, comando, args, db, from, enviartexto, PREFIX } = ctx;

    if (!db.users[sender]) db.users[sender] = {};
    if (!db.chats[from]) db.chats[from] = {};

    const user = db.users[sender];
    const chat = db.chats[from];

    // Una pelea abandonada no debe bloquear el chat para siempre.
    if (chat.pelea && caducada(chat.pelea)) chat.pelea = null;

    // ── .petactivo ──
    if (comando === "petactivo") {
      const encontrada = buscarMascota(user, args[0]);
      if (!encontrada) {
        const claves = Object.keys(user.pets || {});
        if (!claves.length) {
          return enviartexto(`🐾 No tienes mascotas todavía.\n> Consigue una con *${PREFIX}adoptar dragon*.`);
        }
        return enviartexto(
          `🐾 Elige cuál sale primero:\n${claves.map((c) => `› *${c}*`).join("\n")}\n\n> Ejemplo: *${PREFIX}petactivo ${claves[0]}*`,
        );
      }
      user.petActivo = encontrada.clave;
      return enviartexto(`⭐ *${encontrada.pet.name || encontrada.clave}* será tu primera mascota en las peleas.`);
    }

    // ── .pelear / .pelea / .batalla / .retar ──
    if (comando === "pelear" || comando === "pelea" || comando === "batalla" || comando === "retar") {
      // `pelea` sin nada y con pelea en curso = volver al tablero.
      const { jid: retado } = ctx.getTargetFromMsg(ctx.m, args);
      const quiereTablero = !retado && chat.pelea;
      if (quiereTablero && (comando === "pelea" || comando === "batalla")) {
        return enviarTablero(ctx, chat.pelea);
      }
      return iniciarPelea(ctx);
    }

    // ── .atacar ──
    if (comando === "atacar") {
      const numero = Number.parseInt(args[0], 10);
      const indice = Number.isFinite(numero) ? Math.max(1, Math.min(3, numero)) - 1 : 0;
      return atacar(ctx, indice);
    }

    // ── .cambiar ──
    if (comando === "cambiar") return cambiar(ctx, args[0]);

    // ── .huir ──
    if (comando === "huir") return huir(ctx);

    // ── .capturar ──
    if (comando === "capturar") return capturar(ctx);
  },
};
