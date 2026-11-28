/**
 * Compatibilidad histórica: la decoración navideña global está desactivada.
 * Cada plugin conserva el control de sus propios textos y adornos.
 */
export function decorarContenidoNavideno(contenido) {
  return contenido;
}

export function crearSocketNavideno(sock) {
  return sock;
}
