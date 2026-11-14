// CREADOR: Sergio Gómez Gort con Asistencia en Comandos de Shin MD
// BOT: Ado-Bot
//
// Punto de entrada. El arranque real vive en boot/arranque.js y cada pieza del
// núcleo en su propio archivo:
//
//   boot/arranque.js      orden de encendido (conexión, router, sub-bots, vigilantes)
//   boot/router.js        de messages.upsert a un plugin, con aislamiento de fallos
//   boot/subbots.js       ciclo de vida de los sub-bots, con techo de reintentos
//   boot/vigilantes.js    recordatorios, memoria y anti-ban, con su apagado
//   boot/anti-cuelgue.js  que un error suelto no apague el proceso
//   lib/compuerta.js      qué mensaje entrante es un comando
//   lib/bucles.js         corte del eco entre cuentas de bot
//
// Consecuencia práctica: cuando algo falla se abre el archivo de esa pieza.

import { arrancar } from "./boot/arranque.js";

arrancar().catch((err) => {
  console.error("❌ Error fatal al iniciar:", err?.stack || err);
  process.exit(1);
});

export default {};
