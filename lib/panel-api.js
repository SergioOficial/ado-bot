/**
 * API privada del panel web de sub-bots.
 * Solo escucha en localhost por defecto; publicar detrás de Nginx/HTTPS.
 * No guarda credenciales de WhatsApp en GitHub: Baileys conserva las sesiones
 * en sub/SubBots, que ya está excluida del repositorio.
 */
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { inventarioSubbots } from "./inventario-subbots.js";
import { subSesiones } from "./rutas.js";

const codigos = new Map();
const limites = new Map();
let servidor = null;

const numeroLimpio = (valor) => String(valor ?? "").replace(/\D/g, "");
const valido = (n) => n.length >= 8 && n.length <= 15 && !/^1\d{14}$/.test(n);

function responder(res, status, data, origin) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(origin ? {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    } : {}),
  });
  res.end(JSON.stringify(data));
}

function compararToken(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

async function leerJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8192) throw Object.assign(new Error("Cuerpo demasiado grande"), { status: 413 });
  }
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error("JSON inválido"), { status: 400 }); }
}

function inventario() {
  const manager = global.nucleo?.subbots;
  const resumen = manager?.resumen?.() || {};
  let vinculadas = [];
  try { vinculadas = subSesiones(); } catch {}
  return inventarioSubbots({ resumen, vinculadas });
}

function limpiarCodigos() {
  const ahora = Date.now();
  for (const [numero, dato] of codigos) if (dato.expira < ahora) codigos.delete(numero);
}

export function iniciarPanelApi() {
  if (servidor) return servidor;
  const token = String(process.env.PANEL_API_TOKEN || "");
  if (token.length < 32) {
    console.log("ℹ️ Panel web desactivado: define PANEL_API_TOKEN (mínimo 32 caracteres).");
    return null;
  }

  const host = process.env.PANEL_API_HOST || "127.0.0.1";
  const port = Number(process.env.PANEL_API_PORT || 8787);
  const origenPermitido = String(process.env.PANEL_CORS_ORIGIN || "").trim();
  const ownerNumber = numeroLimpio(process.env.PANEL_OWNER_NUMBER || config.ownerNumber);
  if (!valido(ownerNumber)) {
    console.error("❌ Panel web desactivado: PANEL_OWNER_NUMBER no es válido.");
    return null;
  }

  servidor = http.createServer(async (req, res) => {
    const origin = req.headers.origin || "";
    if (origin && origin !== origenPermitido) {
      return responder(res, 403, { ok: false, error: "Origen no permitido" });
    }
    if (req.method === "OPTIONS") {
      if (!origenPermitido || origin !== origenPermitido) return responder(res, 403, { ok: false, error: "Origen no permitido" });
      res.writeHead(204, {
        "Access-Control-Allow-Origin": origenPermitido,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      return res.end();
    }

    const ip = req.socket.remoteAddress || "unknown";
    const ahora = Date.now();
    const rate = limites.get(ip) || { inicio: ahora, cuenta: 0 };
    if (ahora - rate.inicio > 60_000) { rate.inicio = ahora; rate.cuenta = 0; }
    rate.cuenta += 1;
    limites.set(ip, rate);
    if (rate.cuenta > 120) return responder(res, 429, { ok: false, error: "Demasiadas solicitudes" }, origin);

    if (!compararToken(req.headers.authorization?.replace(/^Bearer\s+/i, ""), token)) {
      return responder(res, 401, { ok: false, error: "No autorizado" }, origin);
    }

    const url = new URL(req.url || "/", "http://localhost");
    const manager = global.nucleo?.subbots;
    const sock = global.nucleo?.obtenerSock?.();
    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return responder(res, 200, { ok: true, whatsapp: sock?.ws?.isOpen ? "online" : "starting" }, origin);
      }

      if (req.method === "GET" && url.pathname === "/api/subbots") {
        limpiarCodigos();
        const data = inventario();
        return responder(res, 200, { ok: true, ...data }, origin);
      }

      const pairMatch = url.pathname.match(/^\/api\/pairing\/(\d{8,15})$/);
      if (req.method === "GET" && pairMatch) {
        const phone = pairMatch[1];
        limpiarCodigos();
        const item = codigos.get(phone);
        const fila = inventario().filas.find((f) => f.numero === phone);
        if (fila?.estado === "conectado") return responder(res, 200, { ok: true, status: "connected" }, origin);
        if (item) return responder(res, 200, { ok: true, ...item }, origin);
        return responder(res, 200, { ok: true, status: "pending" }, origin);
      }

      if (req.method === "POST" && url.pathname === "/api/subbots/pair") {
        const body = await leerJson(req);
        const phone = numeroLimpio(body.phone);
        if (!valido(phone)) return responder(res, 400, { ok: false, error: "Número internacional inválido" }, origin);
        if (!sock || !manager) return responder(res, 503, { ok: false, error: "El bot principal aún no está listo" }, origin);
        const actual = inventario().filas.find((f) => f.numero === phone);
        if (actual?.estado === "conectado") return responder(res, 200, { ok: true, status: "connected" }, origin);
        codigos.set(phone, { status: "pending", expira: Date.now() + 150_000 });
        await manager.startSubbot(
          sock,
          `${phone}@s.whatsapp.net`,
          `${ownerNumber}@s.whatsapp.net`,
          () => {},
          "code",
          ownerNumber,
          { onPairingCode: async (code) => codigos.set(phone, { status: "code", code, expira: Date.now() + 60_000 }) },
        );
        return responder(res, 202, { ok: true, status: "pending" }, origin);
      }

      const actionMatch = url.pathname.match(/^\/api\/subbots\/(\d{8,15})$/);
      if (actionMatch && req.method === "POST") {
        const phone = actionMatch[1];
        if (!sock || !manager) return responder(res, 503, { ok: false, error: "El bot principal aún no está listo" }, origin);
        const body = await leerJson(req);
        if (body.action !== "start") return responder(res, 400, { ok: false, error: "Acción no válida" }, origin);
        await manager.startSubbot(
          sock,
          `${phone}@s.whatsapp.net`,
          `${ownerNumber}@s.whatsapp.net`,
          () => {},
          "sesion",
          ownerNumber,
        );
        return responder(res, 202, { ok: true, message: "Inicio solicitado" }, origin);
      }

      if (actionMatch && req.method === "DELETE") {
        const phone = actionMatch[1];
        if (!manager) return responder(res, 503, { ok: false, error: "Gestor de sub-bots no disponible" }, origin);
        const eliminado = await manager.stopSubbot(phone);
        codigos.delete(phone);
        return responder(res, eliminado ? 200 : 404, { ok: eliminado, message: eliminado ? "Sub-bot detenido y sesión eliminada" : "No se encontró una sesión activa" }, origin);
      }

      return responder(res, 404, { ok: false, error: "Ruta no encontrada" }, origin);
    } catch (error) {
      console.error("⚠️ Panel API:", error?.stack || error);
      return responder(res, Number(error?.status) || 500, { ok: false, error: Number(error?.status) ? error.message : "Error interno" }, origin);
    }
  });

  servidor.on("error", (error) => console.error("❌ Panel API:", error.message));
  servidor.listen(port, host, () => console.log(`🌐 Panel API escuchando en http://${host}:${port}`));
  return servidor;
}

export default { iniciarPanelApi };
