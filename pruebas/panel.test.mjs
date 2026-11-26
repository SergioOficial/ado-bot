/** riokuroxi — https://github.com/riokuroxi-svg · Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { webview, desarmar, BOTON } from "../lib/botones.js";
import { nodoBizPropio, nodosInteractivos, nombreDeFlujo } from "../lib/wa-nodes.js";
import { htmlPanel } from "../lib/panel-web.js";
import { proto, generateWAMessageFromContent } from "../lib/baileys.js";
import panel from "../plugins/info/panel.js";

const params = (b) => JSON.parse(b.buttonParamsJson);

export const pruebas = [
  ["open_webview lleva título, enlace interno y hoja alta", () => {
    const b = webview("Menú", "https://example.com/panel");
    igual(b.name, BOTON.WEBVIEW, "tipo de botón");
    const p = params(b);
    igual(p.title, "Menú", "la barra muestra el título, no el dominio");
    igual(p.link.url, "https://example.com/panel", "URL");
    igual(p.link.in_app_webview, true, "dentro de WhatsApp");
    igual(p.webview_presentation, "tall", "hoja alta");
    igual(p.webview_interaction, true, "interacción dentro de la webview");
    igual(params(webview("X", "https://x.y", true, "full")).webview_presentation, "full", "full se respeta");
    igual(params(webview("X", "https://x.y", true, "raro")).webview_presentation, "tall", "valor raro → tall");
  }],

  ["el respaldo en texto del webview muestra el enlace", () => {
    const [d] = desarmar([webview("Menú", "https://example.com/panel")]);
    igual(d.texto, "Menú", "texto del botón");
    igual(d.url, "https://example.com/panel", "URL del enlace");
  }],

  ["el biz propio conoce los flujos con nombre y los alias de pago", () => {
    const formulario = nodoBizPropio({ flujo: "form_message" });
    const hijo = formulario.content.find((c) => c.tag === "interactive").content[0];
    igual(hijo.attrs.name, "form_message", "nombre del flujo");
    igual(hijo.attrs.v, undefined, "form_message va sin v");

    const catalogo = nodoBizPropio({ flujo: "cta_catalog" }).content[0].content[0];
    igual(catalogo.attrs.v, "2", "los flujos nombrados van con v=2");

    const pago = nodoBizPropio({ flujo: "review_and_pay" });
    igual(pago.attrs.native_flow_name, "order_details", "alias del pago");
    esVerdad(!pago.content.some((c) => c.tag === "interactive"), "el pago no lleva hijo interactive");
  }],

  ["los nodos siguen llevando un solo biz y una calidad", () => {
    const contenido = {
      interactiveMessage: {
        nativeFlowMessage: { buttons: [webview("Menú", "https://example.com/panel")] },
      },
    };
    igual(nombreDeFlujo(contenido), "open_webview", "nombre leído del mensaje");
    const nodos = nodosInteractivos("5215512345678@s.whatsapp.net", { contenido });
    igual(nodos.filter((n) => n.tag === "biz").length, 1, "un solo biz");
    const biz = nodos[0];
    igual(biz.content.filter((c) => c.tag === "quality_control").length, 1, "una calidad");
    igual(biz.content.find((c) => c.tag === "interactive").content[0].attrs.name, "mixed", "open_webview usa mixed");
  }],

  ["el open_webview sobrevive a los bytes del protobuf", async () => {
    const armado = await generateWAMessageFromContent(
      "5215512345678@s.whatsapp.net",
      {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: "🎛️ Click aquí para abrir el menú" }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [webview("Menú", "https://riokuroxi-svg.github.io/")],
          }),
        }),
      },
      { userJid: "5215512345678:1@s.whatsapp.net" },
    );
    const vuelta = proto.Message.decode(proto.Message.encode(armado.message).finish());
    const boton = vuelta.interactiveMessage.nativeFlowMessage.buttons[0];
    igual(boton.name, "open_webview", "nombre del botón");
    igual(JSON.parse(boton.buttonParamsJson).title, "Menú", "título");
    igual(JSON.parse(boton.buttonParamsJson).webview_presentation, "tall", "presentación");
    igual(vuelta.interactiveMessage.body.text, "🎛️ Click aquí para abrir el menú", "texto");
  }],

  ["el panel publicado es autónomo", () => {
    const html = htmlPanel(
      [{ titulo: "Subbots", emoji: "🤖", descripcion: "Vinculación", comandos: [{ nombre: "bots", alias: ["sockets"] }] }],
      { nombre: "WaBot", prefijo: ".", contador: 184 },
    );
    igual(html.includes("<title>Menú</title>"), true, "título de la barra nativa");
    igual(html.includes("184 cmds"), true, "contador");
    igual(html.includes("https://"), false, "sin recursos externos");
    igual(html.includes("const datos="), true, "datos embebidos");
    igual(html.includes("<script src"), false, "sin scripts externos");
    const escapado = htmlPanel([{ titulo: "<x>", comandos: [{ nombre: "a" }] }]);
    igual(escapado.includes("\\u003cx\\u003e"), true, "JSON escapado para script");
  }],

  ["el comando del panel existe y no sustituye a .menu", () => {
    esVerdad(panel.command.includes("panel"), "comando panel");
    esVerdad(panel.command.includes("menuweb"), "alias menuweb");
    esVerdad(typeof panel.execute === "function", "tiene execute");
  }],
];
