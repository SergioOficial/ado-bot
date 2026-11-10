/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import {
  enviarConBotones,
  formatoBotones,
  comoClasico,
  rapido,
  copiar,
  enlace,
  llamar,
  lista,
  paramsHoja,
  desarmar,
  respaldo,
  botonPulsado,
  botonesActivos,
  MAX_BOTONES_VISIBLES,
  BOTON,
} from "../lib/botones.js";
import { nodosInteractivos, esPrivado, nodoBizPropio } from "../lib/wa-nodes.js";
import { proto } from "../lib/baileys.js";

const params = (b) => JSON.parse(b.buttonParamsJson);

export const pruebas = [
  ["cada constructor arma su tipo", () => {
    igual(rapido("Uno", "menu admin").name, BOTON.RAPIDO, "rápido");
    igual(params(rapido("Uno", "menu admin")).id, "menu admin", "el id es el comando");
    igual(params(copiar("Copiar", "ABC")).copy_code, "ABC", "copiar");
    igual(params(enlace("Abrir", "https://x.y")).url, "https://x.y", "enlace");
    igual(params(llamar("Llamar", 5358090650)).phone_number, "5358090650", "número en texto");
    igual(rapido("X").buttonParamsJson.includes('"id":"X"'), true, "sin id, el texto es el id");
  }],

  ["la lista desplegable limpia las filas", () => {
    const b = lista("Opciones", [
      { title: "Sección", rows: [{ id: "menu rpg", title: "RPG" }, { id: "menu ia", title: "IA", description: "texto" }] },
    ]);
    igual(b.name, BOTON.LISTA, "tipo");
    const p = params(b);
    igual(p.title, "Opciones", "título");
    igual(p.sections[0].rows[1].description, "texto", "descripción");
    igual(p.sections[0].rows[0].description, "", "sin descripción se pone vacía");
  }],

  ["más de tres botones piden la hoja inferior", () => {
    const tres = [rapido("a"), rapido("b"), rapido("c")];
    igual(paramsHoja(tres), null, "tres caben");
    const cuatro = [...tres, rapido("d")];
    const p = JSON.parse(paramsHoja(cuatro));
    igual(p.bottom_sheet.in_thread_buttons_limit, MAX_BOTONES_VISIBLES, "límite visible");
    igual(p.has_multiple_buttons, true, "marca");
    igual(JSON.parse(paramsHoja(tres, { forzar: true })).bottom_sheet.button_title, "Ver todo", "forzada");
  }],

  ["el respaldo escribe también las listas, para poder teclearlas", () => {
    const texto = respaldo("cuerpo", [
      rapido("⚔️ RPG", "menu rpg"),
      enlace("Abrir", "https://x.y"),
      lista("Explorar", [{ title: "S", rows: [{ id: "menu ia", title: "IA" }] }]),
    ]);
    esVerdad(texto.includes("▸ ⚔️ RPG"), "botón simple");
    esVerdad(texto.includes("▸ Abrir: https://x.y"), "enlace");
    esVerdad(texto.includes("• IA → menu ia"), "fila de la lista con su comando");
  }],

  ["desarmar no revienta con parámetros rotos", () => {
    igual(desarmar([{ buttonParamsJson: "roto" }]), [{ texto: "opción", url: null }], "roto");
    igual(desarmar([rapido("Uno")]), [{ texto: "Uno", url: null }], "normal");
  }],

  ["BOTONES=off manda texto", () => {
    const antes = process.env.BOTONES;
    process.env.BOTONES = "off";
    igual(botonesActivos(), false, "apagado");
    delete process.env.BOTONES;
    igual(botonesActivos(), true, "encendido");
    if (antes !== undefined) process.env.BOTONES = antes;
  }],

  ["los nodos llevan biz → interactive → native_flow y quality_control", () => {
    const nodos = nodosInteractivos("120363000000000000@g.us");
    igual(nodos.length, 1, "en grupo, sin nodo bot");
    const biz = nodos[0];
    igual(biz.tag, "biz", "tag");
    esVerdad(Boolean(biz.attrs.privacy_mode_ts), "sello de tiempo");
    const interactive = biz.content.find((n) => n.tag === "interactive");
    igual(interactive.attrs.type, "native_flow", "tipo");
    igual(interactive.content[0].attrs.name, "mixed", "flujo mixto");
    esVerdad(biz.content.some((n) => n.tag === "quality_control"), "control de calidad");

    const privado = nodosInteractivos("5215512345678@s.whatsapp.net");
    igual(privado.length, 2, "en privado, con nodo bot");
    igual(privado[1].attrs.biz_bot, "1", "marca de bot");
    igual(nodosInteractivos("5215512345678@lid", { ai: false }).length, 1, "@lid sin IA");
    esVerdad(esPrivado("x@lid") && esPrivado("x@s.whatsapp.net") && !esPrivado("x@g.us"), "qué es privado");
  }],

  ["el interactivo sin viewOnce sobrevive a la ida y vuelta", () => {
    const contenido = {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: "cuerpo" }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "pie" }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [rapido("Uno", "menu rpg"), lista("Ver", [{ title: "S", rows: [{ id: "menu ia", title: "IA" }] }])]
            .map((b) => ({ name: b.name, buttonParamsJson: b.buttonParamsJson })),
          messageParamsJson: paramsHoja([rapido("a"), rapido("b"), rapido("c"), rapido("d")]),
        }),
      }),
    };

    const vuelta = proto.Message.decode(proto.Message.encode(contenido).finish());
    const i = vuelta.interactiveMessage;
    esVerdad(Boolean(i), "el interactivo va en la raíz del mensaje");
    // El proto devuelve `null` en los campos que no se usaron: lo que importa
    // es que el mensaje NO vaya dentro de viewOnceMessage.
    igual(null ?? "sin viewOnce", "sin viewOnce", "sin viewOnce");
    igual(i.nativeFlowMessage.buttons.length, 2, "botones");
    igual(params(JSON.parse(JSON.stringify(i.nativeFlowMessage.buttons[0]))).id, "menu rpg", "el id del botón");
    esVerdad(i.nativeFlowMessage.messageParamsJson.includes("bottom_sheet"), "hoja inferior intacta");
  }],

  ["un botón pulsado se convierte en comando", () => {
    const pulsado = botonPulsado({
      message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: "quick_reply", paramsJson: '{"id":"menu ia"}' } } },
    });
    igual(pulsado.id, "menu ia", "id");
    igual(pulsado.nombre, "quick_reply", "tipo");
    igual(botonPulsado({ message: { conversation: "hola" } }), null, "un texto no es un botón");
    igual(botonPulsado({ message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: "roto" } } } }), null, "json roto");
  }],

  ["el nodo biz lleva decision_id y decision_source (lo que emite el cliente oficial)", () => {
    // Comparando nuestro nodo escrito a mano con el de la librería
    // (`getBizBinaryNode`), el nuestro salía sin los dos. No es un adorno: ese
    // nodo es la pista de con qué camino dibujar el mensaje.
    for (const [etiqueta, nodo] of [["de la librería", nodosInteractivos("5215512345678@s.whatsapp.net")[0]], ["de respaldo", nodoBizPropio()]]) {
      const qc = nodo.content.find((c) => c.tag === "quality_control");
      esVerdad(Boolean(qc), `${etiqueta}: quality_control`);
      esVerdad(/^[0-9a-f]{40}$/.test(qc.attrs.decision_id || ""), `${etiqueta}: decision_id de 20 bytes`);
      igual(qc.attrs.source_type, "third_party", `${etiqueta}: source_type`);
      igual(qc.content?.[0]?.tag, "decision_source", `${etiqueta}: hijo decision_source`);
      igual(qc.content[0].attrs.value, "df", `${etiqueta}: valor df`);
    }
  }],

  ["sigue habiendo un solo nodo biz (dos hacen que WhatsApp descarte el mensaje)", () => {
    const nodos = nodosInteractivos("5215512345678@s.whatsapp.net");
    igual(nodos.filter((n) => n.tag === "biz").length, 1, "un biz");
    igual(nodos.length, 2, "biz + bot en privado");
  }],

  ["el formato de botones se elige desde el entorno, sin tocar plugins", () => {
    const antes = process.env.BOTONES_FORMATO;
    delete process.env.BOTONES_FORMATO;
    igual(formatoBotones(), "moderno", "por defecto");
    process.env.BOTONES_FORMATO = "clasico";
    igual(formatoBotones(), "clasico", "clásico");
    process.env.BOTONES_FORMATO = "buttons";
    igual(formatoBotones(), "clasico", "alias buttons");
    process.env.BOTONES_FORMATO = "plantilla";
    igual(formatoBotones(), "plantilla", "plantilla");
    process.env.BOTONES_FORMATO = "lo-que-sea";
    igual(formatoBotones(), "moderno", "valor raro no rompe");
    if (antes === undefined) delete process.env.BOTONES_FORMATO; else process.env.BOTONES_FORMATO = antes;
  }],

  ["solo las respuestas rápidas tienen equivalente clásico", () => {
    igual(comoClasico([rapido("Ver todo", "allmenu"), rapido("Categorías", "menucat")]),
      [{ text: "Ver todo", id: "allmenu" }, { text: "Categorías", id: "menucat" }], "conversión");
    igual(comoClasico([rapido("A", "a"), lista("Explorar", [])]), null, "una lista no se puede");
    igual(comoClasico([lista("Explorar", [])]), null, "solo lista tampoco");
    igual(comoClasico([]), null, "sin botones");
    igual(comoClasico([{ name: BOTON.RAPIDO, buttonParamsJson: "roto" }]), null, "json roto");
  }],

  ["formato plantilla: el interactivo va dentro de templateMessage", async () => {
    const antes = process.env.BOTONES_FORMATO;
    process.env.BOTONES_FORMATO = "plantilla";
    let capturado = null;
    const sock = {
      user: { id: "5215512345678:1@s.whatsapp.net" },
      sendMessage: async () => ({ key: { id: "X" } }),
      relayMessage: async (jid, mensaje, opciones) => { capturado = { mensaje, opciones }; return {}; },
    };
    try {
      await enviarConBotones(sock, "5215512345678@s.whatsapp.net", { texto: "hola", botones: [rapido("A", "a")] });
      esVerdad(Boolean(capturado), "se envió");
      esVerdad(Boolean(capturado.mensaje.templateMessage), "envuelto en plantilla");
      esVerdad(Boolean(capturado.mensaje.templateMessage.interactiveMessageTemplate), "con el interactivo dentro");
      esVerdad(!capturado.mensaje.interactiveMessage, "y no suelto en la raíz");
      esVerdad(Boolean(capturado.mensaje.templateMessage.templateId), "con su templateId");
      igual((capturado.opciones.additionalNodes || []).map((n) => n.tag).join("+"), "biz+bot", "nodos igual");
    } finally {
      if (antes === undefined) delete process.env.BOTONES_FORMATO; else process.env.BOTONES_FORMATO = antes;
    }
  }],

  ["formato clásico: se manda por sendMessage con buttons", async () => {
    const antes = process.env.BOTONES_FORMATO;
    process.env.BOTONES_FORMATO = "clasico";
    let capturado = null;
    const sock = {
      user: { id: "5215512345678:1@s.whatsapp.net" },
      sendMessage: async (jid, contenido) => { capturado = contenido; return { key: { id: "X" } }; },
      relayMessage: async () => ({}),
    };
    try {
      await enviarConBotones(sock, "5215512345678@s.whatsapp.net", { texto: "hola", pie: "pie", botones: [rapido("A", "a"), rapido("B", "b")] });
      igual(capturado.text, "hola", "texto");
      igual(capturado.footer, "pie", "pie");
      igual(capturado.buttons, [{ text: "A", id: "a" }, { text: "B", id: "b" }], "botones clásicos");
      esVerdad(!capturado.interactiveMessage, "nada de interactivo");
    } finally {
      if (antes === undefined) delete process.env.BOTONES_FORMATO; else process.env.BOTONES_FORMATO = antes;
    }
  }],
];
