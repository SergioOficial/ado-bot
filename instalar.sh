#!/usr/bin/env bash
#
# riokuroxi — https://github.com/riokuroxi-svg
# Copyright (C) 2026 riokuroxi-svg
# SPDX-License-Identifier: AGPL-3.0-only · ver LICENSE y NOTICE
#
# instalar.sh — Ado-Bot en un solo comando.
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/SergioOficial/ado-bot/main/instalar.sh)
#
# QUÉ HACE, EN ORDEN
#   1. Mira dónde está corriendo (Termux, Linux, macOS, WSL, contenedor) y con
#      qué arquitectura: de ahí salen las órdenes que se aconsejan al final.
#   2. Comprueba lo que tiene que estar: git, Node y npm. Si falta algo, dice
#      la orden exacta para instalarlo y no toca nada más.
#   3. Clona el bot o lo actualiza. Si ya estaba al día, lo dice y no vuelve a
#      escribir una línea.
#   4. Instala las dependencias.
#   5. Deja un `.env` a partir del ejemplo SOLO si no hay ninguno.
#   6. Comprueba que todo carga, con el bot apagado y sin abrir WhatsApp.
#   7. Deja el comando `ado` en el PATH, para arrancarlo desde cualquier
#      carpeta sin acordarse de la ruta ni de `cd`.
#   8. Arranca el bot (si hay terminal de verdad).
#
# LO QUE NO HACE
#   No borra tu `.env`, no toca `session/` ni `data/`, no pide permisos de
#   administrador y no instala paquetes del sistema a tus espaldas.
#
# VARIABLES
#   ADO_DIR=/ruta         dónde instalarlo (por defecto ~/ado-bot)
#   ADO_BRANCH=main       qué rama traer
#   ADO_SIN_ARRANCAR=1    dejar todo listo, sin arrancar
#   ADO_ARRANCAR=1        arrancar aunque no haya terminal (scripts, CI)
#   ADO_SIN_COLOR=1       sin colores · NO_COLOR=1 hace lo mismo
#
# ARGUMENTOS
#   --dir RUTA · --rama RAMA · --sin-arrancar · --arrancar
#   --actualizar (solo traer cambios) · --ayuda
#
set -eu

REPO="https://github.com/SergioOficial/ado-bot.git"
NOMBRE="Ado-Bot"
DIR="${ADO_DIR:-$HOME/ado-bot}"
RAMA="${ADO_BRANCH:-main}"
MIN_NODE_MAYOR=20
MIN_NODE_MENOR=9
SOLO_ACTUALIZAR=0
QUIERE_ARRANCAR="${ADO_ARRANCAR:-auto}"

# ─────────────────────────── argumentos ───────────────────────────

ayuda() {
  cat <<FIN
${NOMBRE} — instalación en un comando.

  bash <(curl -fsSL https://raw.githubusercontent.com/SergioOficial/ado-bot/main/instalar.sh)

Opciones:
  --dir RUTA        instalar en otra carpeta (por defecto ~/ado-bot)
  --rama RAMA       traer otra rama (por defecto main)
  --actualizar      solo actualizar lo que ya está instalado
  --sin-arrancar    dejar todo listo y salir, sin arrancar el bot
  --arrancar        arrancar al terminar (aunque no haya terminal)
  --sin-color       sin colores (o NO_COLOR=1, o ADO_SIN_COLOR=1)
  -h, --ayuda       esta ayuda

Variables: ADO_DIR, ADO_BRANCH, ADO_SIN_ARRANCAR, ADO_ARRANCAR, NO_COLOR.

Tus datos (.env, session/, data/) no se tocan nunca.
FIN
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dir)         shift; DIR="${1:-$DIR}" ;;
    --rama|--branch) shift; RAMA="${1:-$RAMA}" ;;
    --actualizar|--update) SOLO_ACTUALIZAR=1 ;;
    --sin-arrancar|--no-arrancar) QUIERE_ARRANCAR=0 ;;
    --arrancar)    QUIERE_ARRANCAR=1 ;;
    --sin-color|--no-color) ADO_SIN_COLOR=1 ;;
    -h|--ayuda|--help) ayuda; exit 0 ;;
    *) printf 'No conozco la opción: %s (prueba --ayuda)\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

# ─────────────────────────── salida ───────────────────────────
# Color solo si hay terminal de verdad y nadie lo ha prohibido: redirigir a un
# archivo no debe meter códigos de escape dentro de un registro.
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ -z "${ADO_SIN_COLOR:-}" ] && [ "${TERM:-}" != "dumb" ]; then
  R=$(printf '\033[0m'); NG=$(printf '\033[1m')
  RO=$(printf '\033[38;5;170m'); VD=$(printf '\033[38;5;114m')
  GR=$(printf '\033[38;5;245m'); AM=$(printf '\033[38;5;221m'); RJ=$(printf '\033[38;5;203m')
else
  R=""; NG=""; RO=""; VD=""; GR=""; AM=""; RJ=""
fi

paso()  { printf '\n%s▸ %s%s\n' "$RO$NG" "$*" "$R"; }
bien()  { printf '  %s✓%s %s\n' "$VD" "$R" "$*"; }
dato()  { printf '  %s·%s %s\n' "$GR" "$R" "$*"; }
aviso() { printf '  %s!%s %s\n' "$AM" "$R" "$*" >&2; }
morir() { printf '\n  %s✗ %s%s\n\n' "$RJ" "$*" "$R" >&2; exit 1; }
hay()   { command -v "$1" >/dev/null 2>&1; }

# ─────────────────────── dónde estamos ───────────────────────
detectar_entorno() {
  SO="$(uname -s 2>/dev/null || echo desconocido)"
  ARQ_CRUDA="$(uname -m 2>/dev/null || echo desconocida)"
  case "$ARQ_CRUDA" in
    aarch64|arm64)     ARQ="arm64" ;;
    armv7l|armv8l|arm) ARQ="armv7" ;;
    x86_64|amd64)      ARQ="x86_64" ;;
    i686|i386)         ARQ="x86" ;;
    *)                 ARQ="$ARQ_CRUDA" ;;
  esac

  ENTORNO="$SO"
  case "${PREFIX:-}" in */com.termux/*) ENTORNO="Termux (Android)" ;; esac
  [ -n "${TERMUX_VERSION:-}" ] && ENTORNO="Termux (Android)"
  case "$SO" in
    Darwin) ENTORNO="macOS" ;;
    Linux)
      [ -r /etc/os-release ] && ENTORNO="$(sed -n 's/^PRETTY_NAME="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' /etc/os-release 2>/dev/null | head -n1 || true)"
      [ -n "$ENTORNO" ] || ENTORNO="Linux"
      grep -qi microsoft /proc/version 2>/dev/null && ENTORNO="WSL ($ENTORNO)"
      ;;
  esac
  { [ -f /.dockerenv ] || [ -f /run/.containerenv ]; } && ENTORNO="$ENTORNO · contenedor"

  TERMUX=0
  case "$ENTORNO" in Termux*) TERMUX=1 ;; esac
}

version_de() { node -p "require('$1/package.json').version" 2>/dev/null || echo ""; }
corto() { git -C "$1" rev-parse --short HEAD 2>/dev/null || echo "?"; }

# ─────────────────────────── empieza ───────────────────────────

detectar_entorno

printf '\n%s▸ %s%s\n' "$RO$NG" "$NOMBRE" "$R"
dato "$ENTORNO · $ARQ"

# ── 1. Lo que tiene que estar ────────────────────────────────────────────────
paso "Comprobando lo necesario"

hay git || morir "Falta git." "Termux: pkg install git   ·   Debian/Ubuntu: sudo apt install git   ·   macOS: xcode-select --install"
hay node || morir "Falta Node.js." "Termux: pkg install nodejs-lts   ·   otros: https://nodejs.org"
hay npm || morir "Falta npm (viene con Node.js)."

VERSION_NODE="$(node -v | sed 's/^v//')"
MAYOR="${VERSION_NODE%%.*}"
RESTO="${VERSION_NODE#*.}"
MENOR="${RESTO%%.*}"
if [ "$MAYOR" -lt "$MIN_NODE_MAYOR" ] ||
   { [ "$MAYOR" -eq "$MIN_NODE_MAYOR" ] && [ "$MENOR" -lt "$MIN_NODE_MENOR" ]; }; then
  morir "Node $VERSION_NODE es demasiado viejo." "Hace falta Node $MIN_NODE_MAYOR.$MIN_NODE_MENOR o superior (Termux: pkg install nodejs-lts)."
fi

bien "git $(git --version | sed 's/git version //') · node v$VERSION_NODE · npm $(npm -v)"

# ── 2. El código ─────────────────────────────────────────────────────────────
if [ -d "$DIR/.git" ]; then
  [ "$SOLO_ACTUALIZAR" = "1" ] && paso "Actualizando $DIR" || paso "Revisando $DIR"
  git -C "$DIR" fetch --quiet origin "$RAMA" 2>/dev/null || morir "No pude hablar con GitHub." "Revisa tu conexión y vuelve a intentarlo."
  ANTES="$(corto "$DIR")"

  # `npm install` reescribe package-lock.json, así que un árbol «limpio» casi
  # nunca lo está. Solo se avisa de los cambios que no son ese.
  SUCIO="$(git -C "$DIR" status --porcelain 2>/dev/null | grep -v 'package-lock.json' | head -n1 || true)"

  if git -C "$DIR" pull --ff-only --quiet origin "$RAMA" 2>/dev/null; then
    DESPUES="$(corto "$DIR")"
    if [ "$ANTES" = "$DESPUES" ]; then
      bien "ya estaba al día ($ANTES), que es lo último de $RAMA"
      dato "ni el código ni tus datos se tocan"
    else
      bien "actualizado: $ANTES → $DESPUES"
    fi
    [ -n "$SUCIO" ] && dato "ojo: tienes cambios propios sin guardar en $DIR"
  else
    aviso "no pude actualizar solo: hay cambios locales que chocan"
    dato "mira qué es con:  git -C $DIR status"
    dato "yo sigo con lo que hay instalado"
  fi
elif [ -e "$DIR" ]; then
  morir "$DIR ya existe y no es una instalación del bot." "Muévelo, o instala en otro sitio:  --dir /otra/ruta"
else
  paso "Descargando el bot en $DIR"
  git clone --quiet --depth 1 --branch "$RAMA" "$REPO" "$DIR" ||
    morir "No pude descargar el repositorio." "Comprueba la conexión y que la rama '$RAMA' exista."
  bien "descargado"
fi

cd "$DIR"
VER="$(version_de "$DIR")"
[ -n "$VER" ] || morir "El paquete no trae versión; la descarga vino incompleta."
TAG="$(git -C "$DIR" describe --tags --abbrev=0 2>/dev/null || true)"
bien "$NOMBRE $VER (${TAG:-$RAMA}) · $(corto "$DIR")"

# ── 3. Dependencias ──────────────────────────────────────────────────────────
paso "Instalando dependencias"
if [ -d node_modules ]; then
  dato "ya había dependencias: solo se toca lo que haya cambiado"
else
  dato "la primera vez descarga sharp y sus binarios: es el paso lento"
fi
if [ -f package-lock.json ] && [ ! -d node_modules ]; then
  # Instalación limpia: `npm ci` respeta el lock al milímetro y no lo reescribe.
  SALIDA_NPM="$(npm ci --no-audit --no-fund --loglevel=error 2>&1)" || SALIDA_NPM=""
  [ -n "$SALIDA_NPM" ] || SALIDA_NPM="$(npm install --no-audit --no-fund --loglevel=error 2>&1)" || {
    printf '%s\n' "$SALIDA_NPM" >&2
    morir "Falló la instalación de dependencias." "Prueba a mano:  cd $DIR && npm install"
  }
else
  SALIDA_NPM="$(npm install --no-audit --no-fund --loglevel=error 2>&1)" || {
    printf '%s\n' "$SALIDA_NPM" >&2
    morir "Falló npm install." "Prueba a mano:  cd $DIR && npm install"
  }
fi
RESUMEN_NPM="$(printf '%s\n' "$SALIDA_NPM" | grep -Ei 'added|up to date|changed' | tail -n1 || true)"
if [ -n "$RESUMEN_NPM" ]; then bien "$RESUMEN_NPM"; else bien "dependencias listas"; fi

# ── 4. Tus datos ─────────────────────────────────────────────────────────────
paso "Tus datos"
if [ -f .env ]; then
  bien "tu .env no se toca"
else
  if [ -f .env.example ]; then
    cp .env.example .env
    bien "creado .env a partir del ejemplo"
    dato "pon tu número en OWNERS si quieres ser dueño del bot"
    dato "si no lo tocas, arranca con los valores de config.js"
  else
    aviso "no hay .env.example; el bot usará config.js"
  fi
fi
if [ -d "$DIR/session" ] && [ -n "$(ls -A "$DIR/session" 2>/dev/null || true)" ]; then
  bien "sesión de WhatsApp encontrada: no hay que vincular otra vez"
  HAY_SESION=1
else
  HAY_SESION=0
  dato "sin sesión todavía: el primer arranque pide el número"
fi

# ── 5. Que de verdad carga ───────────────────────────────────────────────────
paso "Comprobando que el bot carga (sin abrir WhatsApp)"
dato "revisa cada archivo del árbol: en el teléfono tarda medio minuto"

# El registro va a un temporal que exista de verdad: en Termux no hay /tmp, y
# ahí es justo donde se instala esto. mktemp ya respeta TMPDIR; si no hubiera
# ningún sitio, el propio repo sirve y luego se borra.
REGISTRO="$(mktemp 2>/dev/null || printf '%s' "$DIR/.ado-verificar.log")"

if npm run --silent verificar >"$REGISTRO" 2>&1; then
  bien "todo en su sitio"
  rm -f "$REGISTRO"
else
  aviso "el verificador encontró algo; esto es lo último que dijo:"
  tail -n 12 "$REGISTRO" | sed 's/^/     /' >&2
  dato "el registro completo: $REGISTRO"
  dato "se puede repetir cuando quieras con: ado verify"
fi

# ── 6. El comando `ado` ──────────────────────────────────────────────────────
# Instalar está bien; acordarse de la ruta cada vez, no. El lanzador son veinte
# líneas sin dependencias: si algo va mal, `cat "$(command -v ado)"` lo enseña.
carpeta_del_lanzador() {
  if [ "$TERMUX" = "1" ] && [ -n "${PREFIX:-}" ] && [ -d "$PREFIX/bin" ]; then
    printf '%s' "$PREFIX/bin"
    return 0
  fi
  d="$HOME/.local/bin"
  [ -d "$d" ] || mkdir -p "$d" 2>/dev/null || return 1
  printf '%s' "$d"
}

instalar_lanzador() {
  case "$DIR" in
    *"'"*|*'"'*|*'$'*|*'`'*|*'\'*)
      aviso "la ruta tiene comillas o \$; no creo el comando 'ado' para no escribir un script roto"
      return 0 ;;
  esac
  L_DIR="$(carpeta_del_lanzador)" || return 0
  [ -n "$L_DIR" ] && [ -w "$L_DIR" ] || { aviso "$L_DIR no es escribible; sigo sin comando 'ado'"; return 0; }
  L_ARCH="$L_DIR/ado"
  L_BASH="$(command -v bash 2>/dev/null || printf '%s' /bin/bash)"

  {
    printf '#!%s\n' "$L_BASH"
    printf '# ado — arranca %s desde cualquier carpeta.\n' "$NOMBRE"
    printf '# Lo escribe el instalador. Si mueves la instalación, vuelve a ejecutarlo.\n'
    printf 'ADO_DIR=%s\n' "'$DIR'"
    cat <<'LANZADOR'
case "${1:-}" in
  ""|start|arrancar)
    [ -f "$ADO_DIR/index.js" ] || { printf 'ado: no encuentro el bot en %s\n' "$ADO_DIR" >&2; exit 1; }
    cd "$ADO_DIR" && exec node index.js ;;
  update|actualizar)
    shift; exec bash "$ADO_DIR/instalar.sh" --actualizar --arrancar "$@" ;;
  verify|comprobar)
    shift; ( cd "$ADO_DIR" && exec npm run --silent verificar "$@" ) ;;
  repair|reparar)
    shift; ( cd "$ADO_DIR" && npm install --no-audit --no-fund && exec npm run --silent verificar ) ;;
  dir|carpeta) printf '%s\n' "$ADO_DIR" ;;
  -v|--version) node -p "require('$ADO_DIR/package.json').version" ;;
  -h|-ayuda|--help|help)
    printf 'ado — %s\n\n' "Ado-Bot"
    printf '  ado              arrancar el bot\n'
    printf '  ado update       actualizar y arrancar\n'
    printf '  ado verify       comprobar que todo carga (sin abrir WhatsApp)\n'
    printf '  ado repair       reinstalar dependencias y comprobar\n'
    printf '  ado dir          enseñar dónde está instalado\n'
    printf '  ado --version    versión instalada\n' ;;
  *) printf 'ado: no conozco "%s". Prueba: ado --help\n' "$1" >&2; exit 2 ;;
esac
LANZADOR
  } > "$L_ARCH.tmp.$$" || { rm -f "$L_ARCH.tmp.$$"; aviso "no pude escribir $L_ARCH"; return 0; }
  chmod 755 "$L_ARCH.tmp.$$" 2>/dev/null || true
  mv -f "$L_ARCH.tmp.$$" "$L_ARCH" || { rm -f "$L_ARCH.tmp.$$"; aviso "no pude dejar $L_ARCH"; return 0; }
  bien "comando 'ado' listo ($L_ARCH)"
  case ":${PATH:-}:" in
    *":$L_DIR:"*) ;;
    *)
      aviso "$L_DIR no está en el PATH: añádelo una vez y quedará"
      printf '      echo '"'"'export PATH="%s:$PATH"'"'"' >> ~/.bashrc && . ~/.bashrc\n' "$L_DIR" >&2
      ;;
  esac
}

paso "El comando 'ado'"
instalar_lanzador

# ── 7. Resumen ───────────────────────────────────────────────────────────────
TITULO="$NOMBRE $VER"
RELLENO="$(printf '%s' "$TITULO" | wc -c | tr -d ' ')"
printf '\n%s╭──────────────────────────────────────────────╮%s\n' "$RO" "$R"
printf '%s│%s  %s%s%s%*s%s│%s\n' "$RO" "$R" "$NG" "$TITULO" "$R" "$((44 - RELLENO))" "" "$RO" "$R"
printf '%s╰──────────────────────────────────────────────╯%s\n' "$RO" "$R"
dato "carpeta   $DIR"
dato "node      v$VERSION_NODE · npm $(npm -v) · $ARQ"

printf '\n%s  Arrancar%s\n' "$NG" "$R"
printf '    ado                          (desde cualquier carpeta, sin cd)\n'
printf '    cd %s && npm start\n' "$DIR"

printf '\n%s  Vincular WhatsApp%s\n' "$NG" "$R"
if [ "$HAY_SESION" = "1" ]; then
  printf '\n    ya hay sesión: arranca y queda conectado\n'
else
  printf '\n    el primer arranque pide tu número y te da un código de 8 caracteres\n'
  printf '    (WhatsApp → Dispositivos vinculados → Vincular con número)\n'
fi

printf '\n%s  Parar%s              Ctrl+C\n' "$NG" "$R"
printf '%s  Actualizar%s         ado update\n' "$NG" "$R"
printf '%s  Comprobar%s          ado verify\n' "$NG" "$R"

if [ "$TERMUX" = "1" ]; then
  printf '\n%s  Que Android no lo mate%s\n' "$NG" "$R"
  printf '    1. baja la notificación de Termux → "Acquire wakelock"\n'
  printf '    2. Ajustes → Batería → Termux → Sin restricciones\n'
  printf '    3. Android 14+: Opciones de desarrollador → desactivar restricciones de procesos hijos\n'
fi
printf '\n%s  Tus datos (.env, session/, data/) no se tocan.%s\n' "$GR" "$R"

# ── 8. Arrancar ──────────────────────────────────────────────────────────────
if [ "$QUIERE_ARRANCAR" = "0" ]; then
  printf '\n'
  exit 0
fi
if [ "$QUIERE_ARRANCAR" = "auto" ] && [ ! -t 1 ]; then
  printf '\n%s  Sin terminal interactiva no arranco nada. Cuando quieras: ado%s\n\n' "$GR" "$R"
  exit 0
fi

paso "Arrancando $NOMBRE"
dato "deja esta terminal abierta · Ctrl+C para parar"
printf '\n'
# exec: el bot pasa a SER este proceso. Así Ctrl+C y el código de salida son
# los del bot, y no queda un instalador colgado detrás.
exec node index.js
