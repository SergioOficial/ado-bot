/** riokuroxi — https://github.com/riokuroxi-svg · Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import {
  leerAjustes, fijarAjuste, borrarAjuste, prefijosDe, modoPrivado,
  enlaceDelBot, canalDelBot, esCanal,
} from "../lib/ajustes.js";
import { crearRouter } from "../boot/router.js";
import setprefix from "../plugins/owner/setprefix.js";
import self from "../plugins/owner/self.js";
import { idDeCanal } from "../plugins/owner/setchannel.js";

const CONFIG = { prefix: [".", "#", "/"], owners: [], botName: "Bot" };

/** Base de datos de mentira, con lo que usan los comandos. */
const dbFalsa = () => ({ settings: {}, users: {}, chats: {}, saveDatabase() {} });

/** Contexto mínimo para lanzar un comando y ver qué contesta. */
function contexto(extra = {}) {
  const respuestas = [];
  const db = extra.db || dbFalsa();
  return {
    ctx: {
      db, config: CONFIG, PREFIX: ".", args: [], sock: { user: { id: "5215500000000@s.whatsapp.net" } },
      enviartexto: async (t) => { respuestas.push(t); }, ...extra,
    },
    respuestas,
  };
}

export const pruebas = [
  [
    "sin nada guardado se usan los prefijos de config.js",
    () => {
      const db = dbFalsa();
      igual(prefijosDe(db, CONFIG).join(","), ".,#,/");
      esVerdad(!modoPrivado(db));
    },
  ],
  [
    "el prefijo guardado manda y sustituye a los de config.js",
    () => {
      const db = dbFalsa();
      fijarAjuste(db, "prefijo", "!");
      igual(prefijosDe(db, CONFIG).join(","), "!");
      borrarAjuste(db, "prefijo");
      igual(prefijosDe(db, CONFIG).length, 3, "al borrarlo vuelven los tres de config.js");
    },
  ],
  [
    "ajustes sobreviven a una base sin el cajón creado",
    () => {
      const db = {};
      igual(typeof leerAjustes(db), "object");
      fijarAjuste(db, "privado", true);
      igual(db.settings.ajustes.privado, true);
      esVerdad(!db.saveDatabase, "no puede reventar si la base no tiene saveDatabase");
    },
  ],
  [
    ".setprefix rechaza letras, espacios y prefijos largos",
    async () => {
      const { ctx, respuestas } = contexto({ args: ["a"] });
      await setprefix.execute(ctx);
      esVerdad(/letras ni números/.test(respuestas[0]), respuestas[0]);

      const dos = contexto({ args: ["abc"] });
      await setprefix.execute(dos.ctx);
      esVerdad(/letras ni números/.test(dos.respuestas[0]), dos.respuestas[0]);

      const largo = contexto({ args: ["!!!"] });
      await setprefix.execute(largo.ctx);
      esVerdad(/uno o dos caracteres/.test(largo.respuestas[0]), largo.respuestas[0]);

      const espacio = contexto({ args: ["! !"] });
      await setprefix.execute(espacio.ctx);
      esVerdad(/espacios/.test(espacio.respuestas[0]), espacio.respuestas[0]);
    },
  ],
  [
    ".setprefix guarda el prefijo y lo puede restablecer",
    async () => {
      const db = dbFalsa();
      const uno = contexto({ db, args: ["!"] });
      await setprefix.execute(uno.ctx);
      igual(db.settings.ajustes.prefijo, "!");
      igual(prefijosDe(db, CONFIG).join(","), "!");

      const dos = contexto({ db, args: ["reset"] });
      await setprefix.execute(dos.ctx);
      igual(db.settings.ajustes.prefijo, undefined);
      igual(prefijosDe(db, CONFIG).length, 3);
    },
  ],
  [
    ".self enciende y apaga el modo privado",
    async () => {
      const db = dbFalsa();
      const uno = contexto({ db, args: ["on"] });
      await self.execute(uno.ctx);
      esVerdad(modoPrivado(db), "tenía que quedar encendido");
      esVerdad(/Modo privado encendido/.test(uno.respuestas[0]));

      const dos = contexto({ db, args: ["off"] });
      await self.execute(dos.ctx);
      esVerdad(!modoPrivado(db), "tenía que quedar apagado");
    },
  ],
  [
    "modo privado: el router ignora a quien no es dueño",
    async () => {
      const db = dbFalsa();
      fijarAjuste(db, "privado", true);
      const atendidos = [];
      const router = crearRouter({
        sock: { user: { id: "5215500000000@s.whatsapp.net" } },
        commands: new Map([["ping", { command: ["ping"], execute: async () => atendidos.push("ping") }]]),
        config: CONFIG,
        obtenerDb: () => db,
        esOwner: (jid) => jid === "5215500000000@s.whatsapp.net",
        esAdminGrupo: async () => false,
        autorReal: (m) => m.key.participant || m.key.remoteJid,
        permitirPropios: true,
      });
      const mensaje = (quien) => ({
        type: "notify",
        messages: [{ key: { remoteJid: "120363@g.us", participant: quien, fromMe: false }, message: { conversation: ".ping" } }],
      });

      await router(mensaje("5215599999999@s.whatsapp.net"));
      igual(atendidos.length, 0, "a un desconocido no se le atiende");

      await router(mensaje("5215500000000@s.whatsapp.net"));
      igual(atendidos.length, 1, "al dueño sí");
    },
  ],
  [
    "el router lee el prefijo guardado en cada mensaje",
    async () => {
      const db = dbFalsa();
      fijarAjuste(db, "prefijo", "!");
      const atendidos = [];
      const router = crearRouter({
        sock: { user: { id: "5215500000000@s.whatsapp.net" } },
        commands: new Map([["ping", { command: ["ping"], execute: async (c) => atendidos.push(c.PREFIX) }]]),
        config: CONFIG,
        obtenerDb: () => db,
        esOwner: () => true,
        esAdminGrupo: async () => false,
        autorReal: (m) => m.key.remoteJid,
        permitirPropios: true,
      });
      await router({ type: "notify", messages: [{ key: { remoteJid: "a@s.whatsapp.net", fromMe: false }, message: { conversation: ".ping" } }] });
      igual(atendidos.length, 0, "con el prefijo viejo ya no entra");
      await router({ type: "notify", messages: [{ key: { remoteJid: "a@s.whatsapp.net", fromMe: false }, message: { conversation: "!ping" } }] });
      igual(atendidos.join(","), "!", "entra por el prefijo nuevo");
    },
  ],
  [
    "enlace y canal del bot: guardar, leer y borrar",
    () => {
      const db = dbFalsa();
      igual(enlaceDelBot(db, { github: "https://github.com/x" }), "https://github.com/x");
      fijarAjuste(db, "enlace", "https://ejemplo.com");
      igual(enlaceDelBot(db, { github: "https://github.com/x" }), "https://ejemplo.com");

      igual(canalDelBot(db), null);
      fijarAjuste(db, "canal", { jid: "120363425322183138@newsletter", nombre: "Canal" });
      igual(canalDelBot(db).jid, "120363425322183138@newsletter");
    },
  ],
  [
    "los enlaces de canal se entienden con y sin enlace completo",
    () => {
      igual(idDeCanal("https://whatsapp.com/channel/0029VbDVFpSGJP89hfZUe522"), "0029VbDVFpSGJP89hfZUe522");
      igual(idDeCanal("0029VbDVFpSGJP89hfZUe522"), "0029VbDVFpSGJP89hfZUe522");
      igual(idDeCanal("hola"), null);
      igual(idDeCanal(""), null);
      esVerdad(esCanal("120363425322183138@newsletter"));
      esVerdad(!esCanal("0029VbDVFpSGJP89hfZUe522@newsletter"), "un id con letras no es un jid de canal");
      esVerdad(!esCanal("120363425322183138@g.us"));
    },
  ],
];
