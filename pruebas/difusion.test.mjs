/** riokuroxi — https://github.com/riokuroxi-svg · Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import difusion from "../plugins/owner/broadcast.js";

/**
 * Un contexto falso mínimo: guarda lo que el bot habría contestado y lo que
 * habría mandado. Lo que se mide aquí es que NO mande nada sin confirmación.
 */
function contexto({ args = [], sender = "5215500000001@s.whatsapp.net", users = {}, antiban } = {}) {
  const respuestas = [];
  const envios = [];
  const ctx = {
    sock: {
      sendMessage: async (jid, contenido) => {
        envios.push({ jid, contenido });
        return {};
      },
    },
    from: "120363000000000000@g.us",
    sender,
    m: { key: { id: "ABC" } },
    args,
    enviartexto: async (txt) => {
      respuestas.push(txt);
    },
    db: { users, antiban: antiban || {}, saveDatabase() {} },
    config: { prefix: ".", botName: "AdoBot" },
  };
  return { ctx, respuestas, envios };
}

export const pruebas = [
  [
    "sin texto enseña el uso y no manda nada",
    async () => {
      const { ctx, respuestas, envios } = contexto({ args: [] });
      await difusion.execute(ctx);
      igual(envios.length, 0, "no puede mandar sin mensaje");
      esVerdad(/Uso/.test(respuestas[0]), `contestó: ${respuestas[0]}`);
    },
  ],
  [
    "con texto enseña la vista previa y no manda nada todavía",
    async () => {
      const { ctx, respuestas, envios } = contexto({
        args: ["Mantenimiento", "en", "10", "minutos"],
        users: {
          "5215500000002@s.whatsapp.net": { coins: 10 },
          "5215500000003@s.whatsapp.net": { level: 3 },
          "120363000000000001@g.us": { xp: 5 }, // un grupo no es un destinatario
          "5215500000004@s.whatsapp.net": {}, // sin actividad: se omite
        },
        antiban: { msgsHoy: 0, total: 0 },
      });
      await difusion.execute(ctx);
      igual(envios.length, 0, "la vista previa no manda el mensaje");
      const texto = respuestas[0];
      esVerdad(/vista previa/i.test(texto), "tiene que decir que es una vista previa");
      esVerdad(/Con actividad \(recibirían\): \*2\*/.test(texto), `no contó bien: ${texto}`);
      esVerdad(/confirmar/.test(texto), "tiene que decir cómo confirmar");
    },
  ],
  [
    "confirmar sin nada pendiente avisa y no manda",
    async () => {
      const { ctx, respuestas, envios } = contexto({
        args: ["confirmar"],
        sender: "5215500000009@s.whatsapp.net",
      });
      await difusion.execute(ctx);
      igual(envios.length, 0);
      esVerdad(/No hay ninguna difusión/.test(respuestas[0]), `contestó: ${respuestas[0]}`);
    },
  ],
  [
    "con la cuota del día gastada no se pone en marcha",
    async () => {
      const { ctx, respuestas, envios } = contexto({
        args: ["prueba", "de", "difusión"],
        users: { "5215500000005@s.whatsapp.net": { coins: 1 } },
        // Cuota del día agotada de sobra: no queda ni el margen de reserva.
        antiban: { msgsHoy: 1_000_000, total: 1_000_000, inicio: "2026-01-01", ultimoDia: new Date().toISOString().slice(0, 10), perfil: "veterano" },
      });
      await difusion.execute(ctx);
      igual(envios.length, 0, "sin cuota no sale nada");
      esVerdad(/No se puede difundir ahora/.test(respuestas[0]), `contestó: ${respuestas[0]}`);
    },
  ],
  [
    "la difusión no manda a grupos ni a usuarios sin actividad",
    async () => {
      const { ctx, respuestas } = contexto({
        args: ["solo", "a", "personas"],
        users: {
          "120363000000000002@g.us": { xp: 1 },
          "5215500000006@s.whatsapp.net": {},
        },
      });
      await difusion.execute(ctx);
      esVerdad(
        /No hay nadie a quien escribir/.test(respuestas[0]),
        `tenía que no encontrar destinatarios: ${respuestas[0]}`
      );
    },
  ],
];
