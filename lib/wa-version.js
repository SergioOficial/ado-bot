/**
 * lib/wa-version.js — qué versión de WhatsApp Web se anuncia al conectar.
 *
 * EL PROBLEMA REAL («actualiza WhatsApp»)
 * ---------------------------------------
 * Baileys se presenta ante los servidores con un número de revisión de
 * WhatsApp Web. Si ese número es viejo, WhatsApp cierra la conexión con
 * «client out of date» y mucha gente lo lee como «actualiza tu WhatsApp», pero
 * el móvil no tiene nada que ver: el desactualizado es el número que manda el
 * bot.
 *
 * `fetchLatestBaileysVersion()` NO consulta a WhatsApp: lee un archivo de
 * versión del repositorio de Baileys. Ese archivo se actualiza a mano y va por
 * detrás. Medido el 8-nov-2026:
 *
 *   fetchLatestBaileysVersion()  → [2, 3000, 1043857760]   (el del repo)
 *   fetchLatestWaWebVersion()    → [2, 3000, 1053864959]   (el de verdad)
 *
 * La diferencia es de más de un mes de revisiones. Por eso se usa SIEMPRE la
 * que se pregunta a WhatsApp (web.whatsapp.com/sw.js) y la del repo queda solo
 * como respaldo si no hay internet.
 */

import { fetchLatestBaileysVersion, fetchLatestWaWebVersion } from "./baileys.js";

/**
 * Devuelve `{ version, fuente, alDia }`.
 *
 * - `fuente`: "whatsapp" (la buena), "repo" (respaldo) o "paquete" (sin red).
 * - `alDia`: si se pudo comparar contra WhatsApp y salió igual.
 */
export async function resolverVersion(log = console.log) {
  const delPaquete = await fetchLatestBaileysVersion().catch((err) => {
    log(`⚠️  No se pudo leer la versión del paquete: ${err.message}`);
    return null;
  });

  const deWhatsApp = await fetchLatestWaWebVersion().catch((err) => {
    log(`⚠️  No se pudo preguntar la versión a WhatsApp: ${err.message}`);
    return null;
  });

  // La de WhatsApp manda, siempre que traiga algo con forma de versión.
  if (deWhatsApp?.version?.length === 3) {
    const igual = Boolean(
      delPaquete?.version && delPaquete.version.join(".") === deWhatsApp.version.join(".")
    );
    return {
      version: deWhatsApp.version,
      fuente: "whatsapp",
      alDia: igual,
      delPaquete: delPaquete?.version || null,
    };
  }

  if (delPaquete?.version?.length === 3) {
    return {
      version: delPaquete.version,
      fuente: "repo",
      alDia: false,
      delPaquete: delPaquete.version,
    };
  }

  // Sin red: se arranca igual, con lo que traiga el paquete instalado.
  return { version: undefined, fuente: "paquete", alDia: false, delPaquete: null };
}

/**
 * Texto de una línea para el arranque. Dice qué versión se usa y de dónde
 * salió, que es lo primero que hay que mirar cuando WhatsApp cierra la
 * conexión sola.
 */
export async function versionParaLog(log = console.log) {
  const r = await resolverVersion(log);
  const num = r.version ? r.version.join(".") : "la del paquete instalado";

  if (r.fuente === "whatsapp") {
    const aviso = r.alDia ? "coincide con la del paquete" : `el paquete trae ${r.delPaquete?.join(".")}`;
    return { ...r, texto: `📦 Versión de WhatsApp Web: ${num} (preguntada a WhatsApp · ${aviso})` };
  }
  if (r.fuente === "repo") {
    return {
      ...r,
      texto: `📦 Versión de WhatsApp Web: ${num} (⚠️ del paquete, sin conexión a WhatsApp: si el bot se desconecta solo, es por esto)`,
    };
  }
  return { ...r, texto: "📦 Versión de WhatsApp Web: la que traiga el paquete instalado" };
}
