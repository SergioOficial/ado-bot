/** Levi-Bot — AGPL-3.0-only · ver LICENSE y NOTICE */
import { igual, esVerdad } from "./ayuda.mjs";
import { ipPrivada, validarURL, ipv4Privada, ipv6Privada } from "../lib/red-segura.js";

const resolverFalso = (mapa) => async (host) => mapa[host] || [];

async function rechaza(url, resolver, motivo) {
  try {
    await validarURL(url, resolver || resolverFalso({}));
  } catch (err) {
    return err.message;
  }
  throw new Error(`no rechazó ${url} (${motivo})`);
}

export const pruebas = [
  ["ips internas de IPv4", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "255.255.255.255"]) {
      esVerdad(ipv4Privada(ip), ip);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "142.250.1.1"]) {
      igual(ipv4Privada(ip), false, ip);
    }
  }],

  ["ips internas de IPv6", () => {
    for (const ip of ["::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "ff02::1"]) {
      esVerdad(ipv6Privada(ip), ip);
    }
    igual(ipv6Privada("2001:4860:4860::8888"), false, "pública");
  }],

  ["ipPrivada no acepta basura", () => {
    esVerdad(ipPrivada("no-es-una-ip"), "texto");
  }],

  ["rechaza esquemas que no son http(s)", async () => {
    igual(await rechaza("file:///etc/passwd"), "Solo se pueden pedir enlaces http o https.", "file");
    igual(await rechaza("gopher://x.test/"), "Solo se pueden pedir enlaces http o https.", "gopher");
    igual(await rechaza("no es una url"), "Ese enlace no se entiende.", "basura");
  }],

  ["rechaza credenciales dentro de la URL", async () => {
    igual(
      await rechaza("https://usuario:clave@x.test/a"),
      "Ese enlace lleva usuario y contraseña dentro: no lo voy a abrir.",
      "credenciales"
    );
  }],

  ["rechaza IP interna escrita a mano", async () => {
    igual(
      await rechaza("http://127.0.0.1:8080/x"),
      "Esa dirección es de la red interna del servidor.",
      "loopback"
    );
    igual(
      await rechaza("http://169.254.169.254/latest/meta-data/"),
      "Esa dirección es de la red interna del servidor.",
      "metadatos"
    );
  }],

  ["rechaza dominio que resuelve a IP interna", async () => {
    const resolver = resolverFalso({ "interno.test": ["192.168.0.10"] });
    igual(
      await rechaza("https://interno.test/x", resolver),
      "Ese dominio apunta a una dirección interna del servidor.",
      "dns privado"
    );
    igual(await rechaza("https://nada.test/x"), "Ese dominio no resuelve a ninguna dirección.", "sin dns");
  }],

  ["acepta un dominio público", async () => {
    const resolver = resolverFalso({ "publico.test": ["93.184.216.34"] });
    const u = await validarURL("https://publico.test/algo?x=1", resolver);
    igual(u.hostname, "publico.test", "host");
    igual(u.protocol, "https:", "protocolo");
  }],
];
