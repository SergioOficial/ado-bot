/**
 * Decoración estacional centralizada para las respuestas de Ado-Bot.
 * No modifica reacciones, borrados ni mensajes multimedia sin texto.
 */
const MARCA = "🎄 ADO-BOT · NAVIDAD 🎄";

export function decorarContenidoNavideno(contenido) {
  if (!contenido || typeof contenido !== "object" || contenido.react || contenido.delete) {
    return contenido;
  }

  let cambiado = false;
  const salida = { ...contenido };
  for (const campo of ["text", "caption"]) {
    const valor = salida[campo];
    if (typeof valor !== "string" || !valor.trim() || valor.includes(MARCA)) continue;
    salida[campo] = `🎄 ━━━ ${MARCA} ━━━ 🎄\n${valor}\n\n❄️ Que la magia de la Navidad acompañe tu día. 💚`;
    cambiado = true;
  }
  return cambiado ? salida : contenido;
}

export function crearSocketNavideno(sock, enviar) {
  return new Proxy(sock, {
    get(objetivo, propiedad) {
      if (propiedad === "sendMessage") return enviar;
      const valor = Reflect.get(objetivo, propiedad, objetivo);
      return typeof valor === "function" ? valor.bind(objetivo) : valor;
    },
  });
}
