/**
 * lib/baileys.js — un solo lugar decide de qué paquete sale el cliente.
 *
 * Todo el bot importa el cliente desde aquí, nunca del paquete directamente.
 * Así cambiar de motor es editar una línea (o una variable de entorno) y no
 * tocar veinte archivos.
 *
 *   Por defecto: @itsliaaa/baileys  (fork de Baileys v7, MIT)
 *   Respaldo:    @whiskeysockets/baileys (oficial, si el fork no está instalado)
 *
 * Para volver al oficial sin tocar código:
 *   BAILEYS_PACKAGE=@whiskeysockets/baileys npm start
 */

const PREFERIDO = process.env.BAILEYS_PACKAGE || "@itsliaaa/baileys";
const OFICIAL = "@whiskeysockets/baileys";

let modulo = null;
let paqueteUsado = null;
let errorPreferido = null;

if (PREFERIDO) {
  try {
    modulo = await import(PREFERIDO);
    paqueteUsado = PREFERIDO;
  } catch (err) {
    errorPreferido = err;
  }
}

if (!modulo) {
  try {
    modulo = await import(OFICIAL);
    paqueteUsado = OFICIAL;
    if (errorPreferido) {
      console.warn(`⚠️  No se pudo cargar "${PREFERIDO}" (${errorPreferido.message}).`);
      console.warn(`⚠️  Usando "${OFICIAL}".`);
    }
  } catch (err) {
    console.error("❌ No hay ningún cliente de WhatsApp instalado.");
    console.error("   Ejecuta: npm install");
    throw err;
  }
}

// Lo que usa el bot. Si algún día falta uno, salta aquí y no a mitad de un
// comando.
const NECESARIOS = [
  "DisconnectReason",
  "useMultiFileAuthState",
  "makeCacheableSignalKeyStore",
  "fetchLatestBaileysVersion",
  "fetchLatestWaWebVersion",
  "downloadMediaMessage",
  "downloadContentFromMessage",
  "proto",
  "generateWAMessageFromContent",
];

const faltantes = NECESARIOS.filter((n) => modulo[n] === undefined);
if (faltantes.length) {
  console.error(`❌ ${paqueteUsado} no exporta: ${faltantes.join(", ")}`);
  console.error("   El bot no puede arrancar con ese paquete.");
  process.exit(1);
}

export const paquete = paqueteUsado;

export const {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  downloadMediaMessage,
  downloadContentFromMessage,
  proto,
  generateWAMessageFromContent,
  WA_DEFAULT_EPHEMERAL,
  Browsers,
  isJidGroup,
  jidNormalizedUser,
  getContentType,
} = modulo;

export default modulo.default;
