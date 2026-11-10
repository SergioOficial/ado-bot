/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { proto } from "../lib/baileys.js";
import { botonPulsado, rapido, copiar, enlace, respaldo } from "../lib/botones.js";

export const pruebas = [
  ["los botones viajan enteros por el proto", () => {
    const contenido = proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: {
            body: { text: "cuerpo" },
            nativeFlowMessage: { buttons: [rapido("Sí", "si"), copiar("C", "txt"), enlace("E", "https://x.test")] },
          },
        },
      },
    });
    const vuelta = proto.Message.decode(proto.Message.encode(contenido).finish());
    const b = vuelta.viewOnceMessage.message.interactiveMessage.nativeFlowMessage.buttons;
    igual(b.length, 3, "tres botones");
    igual(JSON.parse(b[0].buttonParamsJson).id, "si", "id intacto");
    igual(JSON.parse(b[1].buttonParamsJson).copy_code, "txt", "copiar intacto");
    igual(JSON.parse(b[2].buttonParamsJson).url, "https://x.test", "url intacta");
  }],

  ["leer qué botón pulsaron", () => {
    const m = { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: "quick_reply", paramsJson: '{"id":"menu rpg"}' } } } };
    igual(botonPulsado(m).id, "menu rpg", "id");
    igual(botonPulsado({ message: { conversation: "hola" } }), null, "un texto no es un botón");
  }],

  ["respaldo en texto", () => {
    esVerdad(respaldo("cuerpo", [{ texto: "Opción A" }]).includes("▸ Opción A"), "opción");
  }],
];
