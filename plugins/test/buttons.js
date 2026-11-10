/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Ver LICENSE y NOTICE.
 *
 * .boton1 … .boton6 — probar los botones uno por uno, y `.botones` para el índice.
 *
 * Reescrito para que TODO pase por `lib/botones.js`. Antes este plugin armaba
 * sus propios mensajes con el envoltorio `viewOnceMessage`, que es justo lo que
 * deja los botones grises o invisibles en WhatsApp Web, y no mandaba los nodos
 * binarios: el servidor aceptaba el mensaje y el móvil no pintaba nada.
 *
 * Aquí sirve para lo que sirve un banco de pruebas: si un botón no sale, se
 * prueba con `.boton1` y se sabe si es del botón, del mensaje o del teléfono.
 */
import { enviarConBotones, rapido, copiar, enlace, llamar, lista, ubicacion, webview } from "../../lib/botones.js";

export default {
  command: ["boton1", "boton2", "boton3", "boton4", "boton5", "boton6", "boton7", "botones"],
  execute: async (ctx) => {
    const { sock, from, m, comando, enviartexto, config } = ctx;
    const pie = config.botName || "Levi-Bot";

    if (comando === "botones") {
      return enviartexto(
        `🧪 *Prueba de botones*\n\n` +
          `┌✦ *Copiar* → ${config.prefix[0]}boton1\n` +
          `├✦ *Enlace* → ${config.prefix[0]}boton2\n` +
          `├✦ *Respuesta rápida* → ${config.prefix[0]}boton3\n` +
          `├✦ *Llamar* → ${config.prefix[0]}boton4\n` +
          `├✦ *Lista desplegable* → ${config.prefix[0]}boton5\n` +
          `├✦ *Cuatro botones (hoja inferior)* → ${config.prefix[0]}boton6\n` +
          `└✦ *Ubicación y mini web* → ${config.prefix[0]}boton7\n\n` +
          `> Si alguno no aparece, prueba a escribirlo a mano: el respaldo en texto\n` +
          `> siempre llega. Y para apagarlos todos: *BOTONES=off* en el entorno.\n` +
          `> Prefijo: ${config.prefix[0]}`
      );
    }

    const casos = {
      boton1: {
        texto: "📋 *Código de instalación*\n\nPulsa para copiarlo.",
        botones: [copiar("📋 Copiar comando", "npm install")],
      },
      boton2: {
        texto: "🔗 *Enlaces del proyecto*",
        botones: [enlace("🌐 Ver repositorio", "https://github.com/SergioOficial/Levi-bot")],
      },
      boton3: {
        texto: "🎮 *¿Qué quieres hacer?*",
        botones: [
          rapido("📋 Ver menú", "menu"),
          rapido("🏓 Ping", "ping"),
          rapido("👑 Creadores", "creadores"),
        ],
      },
      boton4: {
        texto: "📞 *Soporte*\n\nSi necesitas ayuda, llama al dueño.",
        botones: [llamar("📞 Llamar", config.ownerNumber || (config.owners?.[0]?.number ?? ""))],
      },
      boton5: {
        texto: "📋 *Selecciona una opción*",
        botones: [
          lista("Abrir menú", [
            {
              title: "📱 Básicos",
              rows: [
                { id: "menu", title: "📋 Menú", description: "Todos los comandos" },
                { id: "ping", title: "🏓 Ping", description: "Ver si responde" },
                { id: "creadores", title: "👑 Creadores", description: "Quién hizo el bot" },
              ],
            },
            {
              title: "🛡️ Grupo",
              rows: [
                { id: "close", title: "🔒 Cerrar grupo", description: "Solo administradores" },
                { id: "open", title: "🔓 Abrir grupo", description: "Solo administradores" },
              ],
            },
          ]),
        ],
      },
      boton6: {
        // Cuatro botones: WhatsApp solo dibuja tres, así que este es el que
        // comprueba que la hoja inferior (`messageParamsJson`) hace su trabajo.
        texto: "🎯 *Panel de control*\n\nCuatro opciones (el cuarto va en la hoja).",
        botones: [
          enlace("🌐 Repositorio", "https://github.com/SergioOficial/Levi-bot"),
          copiar("📋 Comando de inicio", "npm start"),
          rapido("📋 Ver menú", "menu"),
          rapido("🩺 Salud", "health"),
        ],
        hoja: { titulo: "Más opciones", boton: "Ver todo", divisiones: [1] },
      },
      boton7: {
        texto: "📍 *Ubicación y mini web*\n\nDos tipos poco usados, para probarlos.",
        botones: [
          ubicacion("📍 Mandar mi ubicación"),
          webview("🌐 GitHub en WhatsApp", "https://github.com/SergioOficial/Levi-bot"),
        ],
      },
    };

    const caso = casos[comando];
    if (!caso) return enviartexto("❌ Ese botón no existe.");

    await enviarConBotones(sock, from, { ...caso, pie, cita: m }).catch(() => {});
  },
};
