import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("./data");
const EVENTOS_FILE = path.join(DATA_DIR, "eventos.json");

// Aseguramos que exista el archivo de eventos
function cargarEventos() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(EVENTOS_FILE)) return [];
    return JSON.parse(fs.readFileSync(EVENTOS_FILE, "utf8")) || [];
  } catch { return []; }
}

function guardarEventos(eventos) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(EVENTOS_FILE, JSON.stringify(eventos, null, 2), "utf8");
  } catch (e) { console.error("Error guardando eventos:", e.message); }
}

// Formatear cuenta regresiva
function cuentaRegresiva(timestamp) {
  const ahora = Date.now();
  const diff = timestamp - ahora;

  if (diff <= 0) return "¡El evento es HOY o ya pasó! 🎉";

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `⏳ Faltan *${dias}d ${horas}h ${mins}m*`;
}

// Variable global para el socket (para el temporizador)
let sockInstance = null;

// Temporizador que revisa cada minuto si hay eventos para hoy
setInterval(async () => {
  if (!sockInstance) return;
  const eventos = cargarEventos();
  const ahora = Date.now();
  let actualizado = false;

  for (const ev of eventos) {
    // Si no se ha enviado y ya llegó la hora
    if (!ev.enviado && ahora >= ev.timestamp) {
      try {
        console.log(`📢 Enviando evento global: ${ev.nombre}`);
        const groups = await sockInstance.groupFetchAllParticipating();
        
        for (const id of Object.keys(groups)) {
          const texto = `🎉 *¡EVENTO ESPECIAL!* 🎉\n\n${ev.mensaje}\n\n> ${ev.nombre}`;
          await sockInstance.sendMessage(id, { text: texto }).catch(() => {});
        }
        
        ev.enviado = true;
        actualizado = true;
      } catch (e) {
        console.error(`Error enviando evento ${ev.nombre}:`, e.message);
      }
    }
  }

  if (actualizado) guardarEventos(eventos);
}, 60000); // Revisa cada 60 segundos

export default {
  command: ["evento", "event", "eventos"],
  category: "admin",
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config, isOwner, isAdmin, comando } = ctx;
    const p = config.prefix[0];
    const cmd = comando || "evento";
    const sub = (args[0] || "").toLowerCase();

    // Guardamos el socket para el temporizador global
    if (!sockInstance) sockInstance = sock;

    // Verificar permisos (Owner o Admin)
    if (!isOwner && !isAdmin) {
      return enviartexto("❌ Solo los administradores pueden usar este comando.");
    }

    let eventos = cargarEventos();

    /* ══════════════ CREAR EVENTO ══════════════ */
    if (sub === "set" || sub === "crear" || sub === "add") {
      const texto = args.slice(1).join(" ");
      // Formato esperado: .evento set Nombre | DD/MM/YYYY | Mensaje
      const partes = texto.split("|").map(p => p.trim());

      if (partes.length < 3) {
        return enviartexto(
          `✍️ *Uso correcto:*\n` +
          `> *${p}${cmd} set <Nombre> | <DD/MM/AAAA> | <Mensaje>*\n\n` +
          `*Ejemplo:*\n` +
          `> ${p}${cmd} set Navidad | 25/12/2026 | 🎄 ¡Feliz Navidad a todos!`
        );
      }

      const [nombre, fechaStr, mensaje] = partes;

      // Parsear fecha
      const [dia, mes, anio] = fechaStr.split("/").map(Number);
      if (!dia || !mes || !anio || dia > 31 || mes > 12 || anio < 2024) {
        return enviartexto("❌ Fecha inválida. Usa el formato DD/MM/AAAA (ej: 25/12/2026).");
      }

      // El mensaje se enviará a las 00:00 del día indicado
      const fecha = new Date(anio, mes - 1, dia, 0, 0, 0);
      const timestamp = fecha.getTime();

      // Verificar si ya existe un evento con ese nombre
      if (eventos.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
        return enviartexto(`⚠️ Ya existe un evento llamado *${nombre}*.`);
      }

      eventos.push({
        nombre,
        timestamp,
        mensaje,
        enviado: false,
        creadoPor: m.sender
      });
      guardarEventos(eventos);

      return enviartexto(
        `✅ *Evento creado con éxito*\n\n` +
        `📌 *Nombre:* ${nombre}\n` +
        `📅 *Fecha:* ${dia}/${mes}/${anio}\n` +
        `📝 *Mensaje:* ${mensaje}\n\n` +
        `> El mensaje se enviará a todos los grupos el día del evento.`
      );
    }

    /* ══════════════ VER EVENTO ══════════════ */
    if (sub === "ver" || sub === "info" || !sub) {
      const nombreBusqueda = args.slice(1).join(" ").toLowerCase();
      
      if (nombreBusqueda) {
        const ev = eventos.find(e => e.nombre.toLowerCase() === nombreBusqueda);
        if (!ev) return enviartexto(`❌ No encontré el evento *${nombreBusqueda}*.`);

        const fecha = new Date(ev.timestamp);
        return enviartexto(
          `📅 *Detalles del Evento*\n\n` +
          `📌 *Nombre:* ${ev.nombre}\n` +
          `🗓️ *Fecha:* ${fecha.toLocaleDateString('es-ES')}\n` +
          `📝 *Mensaje:* ${ev.mensaje}\n\n` +
          `${ev.enviado ? "✅ *Estado:* Ya enviado" : cuentaRegresiva(ev.timestamp)}`
        );
      }

      // Listar todos si no hay búsqueda
      if (!eventos.length) return enviartexto("📭 No hay eventos programados.");

      let lista = "📅 *Eventos Programados*\n\n";
      eventos.sort((a, b) => a.timestamp - b.timestamp).forEach(ev => {
        const fecha = new Date(ev.timestamp);
        const estado = ev.enviado ? "✅ Enviado" : cuentaRegresiva(ev.timestamp);
        lista += `🔹 *${ev.nombre}* (${fecha.toLocaleDateString('es-ES')})\n`;
        lista += `   └ ${estado}\n`;
      });

      lista += `\n> Para ver uno en detalle: *${p}${cmd} ver <nombre>*`;
      return enviartexto(lista);
    }

    /* ══════════════ ELIMINAR EVENTO ══════════════ */
    if (sub === "del" || sub === "borrar" || sub === "eliminar") {
      const nombreBusqueda = args.slice(1).join(" ").toLowerCase();
      if (!nombreBusqueda) return enviartexto(`✍️ Uso: *${p}${cmd} del <nombre>*`);

      const index = eventos.findIndex(e => e.nombre.toLowerCase() === nombreBusqueda);
      if (index === -1) return enviartexto(`❌ No encontré el evento *${nombreBusqueda}*.`);

      const eliminado = eventos.splice(index, 1)[0];
      guardarEventos(eventos);
      return enviartexto(`🗑️ Evento *${eliminado.nombre}* eliminado correctamente.`);
    }

    /* ══════════════ AYUDA ══════════════ */
    return enviartexto(
      `🎉 *Sistema de Eventos Globales*\n\n` +
      `> *${p}${cmd} set <Nombre> | <DD/MM/AAAA> | <Mensaje>*\n` +
      `> Crea un evento que se enviará a todos los grupos a las 00:00 de ese día.\n\n` +
      `> *${p}${cmd} ver [nombre]*\n` +
      `> Muestra la cuenta regresiva de un evento o lista todos.\n\n` +
      `> *${p}${cmd} del <nombre>*\n` +
      `> Elimina un evento programado.`
    );
  }
};