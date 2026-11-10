/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import {
  numeroDe, esAdminMeta, objetivo, mencion, warnsDe, ponerWarns, limiteDe,
} from "../lib/grupo.js";

export const pruebas = [
  ["el número sale de cualquier forma de JID", () => {
    igual(numeroDe("5215512345678@s.whatsapp.net"), "5215512345678", "teléfono");
    igual(numeroDe("5215512345678:12@s.whatsapp.net"), "5215512345678", "con dispositivo");
    igual(numeroDe("18492305712@lid"), "18492305712", "lid");
    igual(numeroDe(""), "", "vacío");
  }],

  ["un admin es admin aunque venga con otro JID", () => {
    const lista = [
      { id: "111@lid", phoneNumber: "5215512345678@s.whatsapp.net", admin: "admin" },
      { id: "222@s.whatsapp.net", admin: null },
    ];
    esVerdad(esAdminMeta(lista, "5215512345678@s.whatsapp.net"), "por teléfono");
    esVerdad(esAdminMeta(lista, "111@lid"), "por lid");
    igual(esAdminMeta(lista, "222@s.whatsapp.net"), false, "no admin");
    igual(esAdminMeta(lista, "999@lid"), false, "desconocido");
    igual(esAdminMeta(lista, ""), false, "sin jid");
  }],

  ["el objetivo se busca en mención, cita o número", () => {
    const conMencion = {
      m: { message: { extendedTextMessage: { contextInfo: { mentionedJid: ["111@s.whatsapp.net"] } } } },
      args: [],
    };
    igual(objetivo(conMencion), "111@s.whatsapp.net", "mención");

    const conCita = {
      m: { message: { extendedTextMessage: { contextInfo: { participant: "222@s.whatsapp.net" } } } },
      args: [],
    };
    igual(objetivo(conCita), "222@s.whatsapp.net", "cita");

    const conNumero = { m: { message: { conversation: ".warn 5215512345678" } }, args: ["5215512345678", "spam"] };
    igual(objetivo(conNumero), "5215512345678@s.whatsapp.net", "número escrito");

    igual(objetivo({ m: { message: {} }, args: [] }), null, "sin nadie");
  }],

  ["mención con nombre", () => {
    const db = { users: { "111@s.whatsapp.net": { nombre: "Ana" } } };
    igual(mencion("111@s.whatsapp.net", db), "@111 (Ana)", "con nombre");
    igual(mencion("222@s.whatsapp.net", db), "@222", "sin nombre");
  }],

  ["las advertencias se normalizan aunque el JSON esté roto", () => {
    const db = { chats: { g: { warns: { "111@s": "{esto no es json" } } } };
    igual(warnsDe(db, "g", "111@s"), [], "roto → vacío");
    ponerWarns(db, "g", "111@s", [{ razon: "x", fecha: 1, por: "2@s" }]);
    igual(warnsDe(db, "g", "111@s").length, 1, "guarda");
  }],

  ["límite por defecto 3 y respeta el configurado", () => {
    igual(limiteDe({}, "g"), 3, "por defecto");
    igual(limiteDe({ chats: { g: { warnLimit: 5 } } }, "g"), 5, "configurado");
    igual(limiteDe({ chats: { g: { warnLimit: 0 } } }, "g"), 3, "cero no vale");
  }],
];
