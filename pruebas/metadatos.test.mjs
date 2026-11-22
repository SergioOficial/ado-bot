/** riokuroxi — https://github.com/riokuroxi-svg · Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { crearCola, envolverSocket } from "../lib/antiban.js";
import { secretoDeMensaje, idDeMensaje, llevaInteractivo, sellar, huellaDe } from "../lib/metadatos.js";
import { prepararAntiban } from "../boot/vigilantes.js";

/** Un interactivo como los que arma lib/botones.js. */
const interactivo = (texto = "hola") => ({
  messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
  interactiveMessage: { body: { text: texto }, nativeFlowMessage: { buttons: [] } },
});

export const pruebas = [
  [
    "el secreto de mensaje son 32 bytes al azar y no se repite",
    () => {
      const a = secretoDeMensaje();
      const b = secretoDeMensaje();
      igual(Buffer.from(a, "base64").length, 32);
      igual(Buffer.from(b, "base64").length, 32);
      esVerdad(a !== b, "dos secretos seguidos no pueden ser iguales");
    },
  ],
  [
    "el identificador corto cambia y solo usa letras y números",
    () => {
      const a = idDeMensaje(30);
      igual(a.length, 30);
      esVerdad(/^[A-Z0-9]+$/.test(a), `salida inesperada: ${a}`);
      esVerdad(a !== idDeMensaje(30), "dos identificadores seguidos no pueden ser iguales");
    },
  ],
  [
    "sellar no toca un mensaje de solo texto",
    () => {
      const mensaje = { text: "hola" };
      sellar(mensaje);
      igual(mensaje.messageContextInfo, undefined);
      igual(Object.keys(mensaje).length, 1);
    },
  ],
  [
    "sellar pone secreto a un interactivo y respeta el texto",
    () => {
      const mensaje = interactivo("menú de siempre");
      const antes = huellaDe(mensaje);
      sellar(mensaje);
      esVerdad(Boolean(mensaje.messageContextInfo.messageSecret), "falta el secreto");
      igual(Buffer.from(mensaje.messageContextInfo.messageSecret, "base64").length, 32);
      igual(mensaje.interactiveMessage.body.text, "menú de siempre");
      igual(huellaDe(mensaje), antes, "la huella de lo visible no puede cambiar");
    },
  ],
  [
    "sellar no pisa un secreto que ya venía puesto",
    () => {
      const mensaje = interactivo();
      const propio = secretoDeMensaje();
      mensaje.messageContextInfo.messageSecret = propio;
      sellar(mensaje);
      igual(mensaje.messageContextInfo.messageSecret, propio);
    },
  ],
  [
    "sellar pone identificador de plantilla si falta y respeta el que venga",
    () => {
      // lib/botones.js ya arma uno nuevo en cada mensaje; esto es la red de
      // seguridad para cualquier otro sitio que mande plantillas.
      const sinNada = { templateMessage: {} };
      sellar(sinNada);
      esVerdad(Boolean(sinNada.templateMessage.templateId), "tenía que poner un identificador");

      const propio = { templateMessage: { templateId: "el-mio" } };
      sellar(propio);
      igual(propio.templateMessage.templateId, "el-mio");
    },
  ],
  [
    "dos envíos del mismo interactivo salen con relleno distinto",
    () => {
      const a = interactivo("mismo texto");
      const b = interactivo("mismo texto");
      sellar(a);
      sellar(b);
      esVerdad(
        a.messageContextInfo.messageSecret !== b.messageContextInfo.messageSecret,
        "el secreto tiene que ser distinto en cada mensaje"
      );
      igual(huellaDe(a), huellaDe(b), "lo que se ve sí es igual: eso no se toca");
    },
  ],
  [
    "detecta interactivos envueltos en viewOnce y en efímeros",
    () => {
      esVerdad(llevaInteractivo({ viewOnceMessageV2: { message: interactivo() } }), "viewOnce");
      esVerdad(llevaInteractivo({ ephemeralMessage: { message: interactivo() } }), "efímero");
      esVerdad(!llevaInteractivo({ text: "nada" }), "el texto no es interactivo");
      esVerdad(!llevaInteractivo(null), "null no es interactivo");
    },
  ],
  [
    "envolverSocket sella los interactivos que salen por el socket",
    async () => {
      const enviados = [];
      const sock = {
        sendMessage: async (jid, contenido) => enviados.push(contenido),
        relayMessage: async () => ({}),
      };
      envolverSocket(sock, { cola: crearCola({}) });
      await sock.sendMessage("x@s.whatsapp.net", interactivo("a"));
      await sock.sendMessage("x@s.whatsapp.net", interactivo("a"));
      igual(enviados.length, 2);
      esVerdad(Boolean(enviados[0].messageContextInfo?.messageSecret), "el primero sin secreto");
      esVerdad(
        enviados[0].messageContextInfo.messageSecret !== enviados[1].messageContextInfo.messageSecret,
        "los dos secretos tienen que ser distintos"
      );
      igual(enviados[0].interactiveMessage.body.text, "a");
    },
  ],
  [
    "cada sub-bot lleva su propio tope, no el del bot padre",
    () => {
      const db = { antiban: {}, ritmo: {} };
      const obtenerDb = () => db;
      const sock = {
        sendMessage: async () => ({}),
        relayMessage: async () => ({}),
        sendPresenceUpdate: async () => {},
      };
      const padre = prepararAntiban(sock, { obtenerDb, encendido: true });
      padre.limitador.anotarEnvio();
      padre.limitador.anotarEnvio();

      const subSock = {
        sendMessage: async () => ({}),
        relayMessage: async () => ({}),
        sendPresenceUpdate: async () => {},
      };
      const sub = prepararAntiban(subSock, { obtenerDb, encendido: true, clave: "5215512345678" });

      igual(padre.limitador.resumen().msgsHoy, 2);
      igual(sub.limitador.resumen().msgsHoy, 0, "el sub-bot empieza su propio día en 0");
      esVerdad(Boolean(db.antibanSubbots["5215512345678"]), "tiene que existir el estado del sub-bot");
      igual(db.antiban.msgsHoy, 2, "el estado del padre no se toca");
      igual(sock.__colaAntiban, true);
      igual(subSock.__colaAntiban, true, "el socket del sub-bot también va envuelto");
    },
  ],
];
