/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL.
 *
 * lib/bucles.js — que dos cuentas de bot no se contesten hasta morir.
 *
 * `lib/compuerta.js` ya descarta lo que el bot se manda a sí mismo (`fromMe`).
 * Eso no basta cuando hay varias cuentas corriendo el mismo código en el mismo
 * grupo, que es justo lo que hace `.jadibot`: el sub-bot ve el mensaje del
 * principal como ajeno y responde, y si esa respuesta vuelve a traer un comando
 * el principal la contesta otra vez. El eco no lo produce nadie solo; lo
 * producen dos.
 *
 * Aquí se cortan los dos patrones que se ven en la práctica:
 *
 *   1. ECO  — la misma cuenta repite el mismo comando calcado en menos de un
 *      segundo y pico. Una persona no escribe `.menu` dos veces en 600 ms; un
 *      bucle sí. Se mira la huella completa (chat + autor + comando +
 *      argumentos), así que dos personas pidiendo lo mismo a la vez no se
 *      estorban.
 *   2. AUTORESPUESTA — el mensaje cita uno que este mismo socket acaba de
 *      mandar. Si me estoy contestando a mí mismo, ya hay bucle; se para.
 *
 * Las dos ventanas son cortas a propósito: cortan la repetición mecánica sin
 * meterse con el uso normal. Todo vive en memoria y con tope de entradas, que un
 * filtro anti-bucle no puede ser él mismo una fuga de RAM.
 */

export const AJUSTES_GUARDA = {
  /** ms durante los que una huella calcada cuenta como eco. */
  ventanaMs: 1200,
  /** ms durante los que se recuerda un mensaje saliente. */
  memoriaSalidasMs: 5 * 60 * 1000,
  /** Tope de huellas recordadas; al pasar se tiran las más viejas. */
  maximoHuellas: 800,
  /** Tope de claves salientes recordadas. */
  maximoSalidas: 300,
};

/** La huella de un pedido: quién pidió qué y dónde. */
export function huellaDe(pedido) {
  // `|| {}` y no `= {}`: el valor por defecto no cubre un `null` explícito.
  const { chat = "", autor = "", comando = "", args = [] } = pedido || {};
  const argumentos = Array.isArray(args) ? args.join(" ") : String(args || "");
  return `${chat}|${autor}|${String(comando || "").toLowerCase()}|${argumentos.trim().toLowerCase()}`;
}

/**
 * Crea la guarda. Va una por socket (el principal y cada sub-bot tienen la
 * suya) porque las claves de los mensajes salientes son de esa cuenta.
 */
export function crearGuardaBucles(ajustes = {}) {
  const cfg = { ...AJUSTES_GUARDA, ...(ajustes || {}) };
  const ecos = new Map(); // huella → { veces, ultima }
  const salidas = new Map(); // clave → { jid, cuando }
  let cortados = 0;
  let vistos = 0;

  function podar(ahora) {
    if (ecos.size > cfg.maximoHuellas) {
      const orden = [...ecos.entries()].sort((a, b) => a[1].ultima - b[1].ultima);
      for (const [clave] of orden.slice(0, Math.ceil(ecos.size / 4))) ecos.delete(clave);
    }
    if (salidas.size > cfg.maximoSalidas) {
      for (const [clave, dato] of salidas) {
        if (ahora - dato.cuando > cfg.memoriaSalidasMs) salidas.delete(clave);
      }
      if (salidas.size > cfg.maximoSalidas) {
        const orden = [...salidas.entries()].sort((a, b) => a[1].cuando - b[1].cuando);
        for (const [clave] of orden.slice(0, Math.ceil(salidas.size / 4))) salidas.delete(clave);
      }
    }
  }

  /** Apuntar un mensaje que este socket acaba de mandar. */
  function anotarSalida(enviado, contenido, cuando) {
    try {
      const id = enviado?.key?.id;
      if (!id) return null;
      const ahora = typeof cuando === "number" ? cuando : Date.now();
      const jid = enviado?.key?.remoteJid || contenido?.jid || null;
      salidas.set(String(id), { jid, cuando: ahora });
      podar(ahora);
      return String(id);
    } catch {
      return null;
    }
  }

  /** ¿Este mensaje entrante cita algo que mandé yo hace poco? */
  function citaPropia(m, cuando) {
    const ahora = typeof cuando === "number" ? cuando : Date.now();
    const ctxInfo =
      m?.message?.extendedTextMessage?.contextInfo ||
      m?.message?.imageMessage?.contextInfo ||
      m?.message?.videoMessage?.contextInfo ||
      m?.message?.stickerMessage?.contextInfo ||
      null;
    const citada = ctxInfo?.stanzaId;
    if (!citada) return false;
    const salida = salidas.get(String(citada));
    if (!salida) return false;
    if (ahora - salida.cuando > cfg.memoriaSalidasMs) {
      salidas.delete(String(citada));
      return false;
    }
    return true;
  }

  /**
   * ¿Dejo pasar este pedido?
   * Devuelve `{ pasa, motivo }`. No lanza nunca.
   */
  function permite(pedido, m, cuando) {
    vistos += 1;
    // El reloj se puede pasar explícitamente; las pruebas lo usan para no tener
    // que dormir. En marcha siempre es `Date.now()`.
    const ahora = typeof cuando === "number" ? cuando : Date.now();
    try {
      if (citaPropia(m, ahora)) {
        cortados += 1;
        return { pasa: false, motivo: "respuesta propia citada" };
      }

      const clave = huellaDe(pedido);
      const anterior = ecos.get(clave);

      if (anterior && ahora - anterior.ultima < cfg.ventanaMs) {
        anterior.veces += 1;
        anterior.ultima = ahora;
        cortados += 1;
        return { pasa: false, motivo: `eco (${anterior.veces} iguales seguidos)` };
      }

      ecos.set(clave, { veces: 1, ultima: ahora });
      podar(ahora);
      return { pasa: true, motivo: null };
    } catch {
      // Ante la duda, que pase: cortar un comando real es peor que dejar uno.
      return { pasa: true, motivo: null };
    }
  }

  function resumen() {
    return { vistos, cortados, huellas: ecos.size, salidas: salidas.size, ajustes: cfg };
  }

  function reiniciar() {
    ecos.clear();
    salidas.clear();
    cortados = 0;
    vistos = 0;
  }

  return { permite, anotarSalida, citaPropia, huella: huellaDe, resumen, reiniciar, ajustes: cfg };
}

export default { crearGuardaBucles, huellaDe, AJUSTES_GUARDA };
