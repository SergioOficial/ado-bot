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
# Qué hace, en este orden: comprueba que estén git y Node, clona el bot (o lo
# actualiza si ya está), instala las dependencias, deja un `.env` a partir del
# ejemplo si no hay ninguno, y comprueba que todo cargue antes de arrancar.
#
# Lo que NO hace: no toca tu base de datos, no borra tu `.env`, no pide permisos
# de administrador y no arranca el bot sin que tú lo pidas.
#
# Variables útiles:
#   ADO_DIR=/ruta    dónde instalarlo (por defecto ~/ado-bot)
#   ADO_BRANCH=main  qué rama traer
#   ADO_ARRANCAR=1   arrancar al terminar
#   ADO_SIN_COLOR=1  sin colores

set -euo pipefail

REPO="https://github.com/SergioOficial/ado-bot.git"
DIR="${ADO_DIR:-$HOME/ado-bot}"
RAMA="${ADO_BRANCH:-main}"
MIN_NODE_MAJOR=20
MIN_NODE_MINOR=9

if [ -t 1 ] && [ "${ADO_SIN_COLOR:-0}" != "1" ]; then
  AZUL="\033[1;34m"; VERDE="\033[1;32m"; ROJO="\033[1;31m"; AMARILLO="\033[1;33m"; GRIS="\033[0;90m"; SIN="\033[0m"
else
  AZUL=""; VERDE=""; ROJO=""; AMARILLO=""; GRIS=""; SIN=""
fi

paso() { printf "${AZUL}▸ %s${SIN}\n" "$1"; }
bien() { printf "${VERDE}✓ %s${SIN}\n" "$1"; }
aviso() { printf "${AMARILLO}! %s${SIN}\n" "$1"; }
mal() { printf "${ROJO}✗ %s${SIN}\n" "$1" >&2; }

morir() {
  mal "$1"
  [ -n "${2:-}" ] && printf "${GRIS}%s${SIN}\n" "$2" >&2
  exit 1
}

printf "\n${AZUL}   Ado-Bot — instalación${SIN}\n"
printf "${GRIS}   Un bot de WhatsApp modular: cada comando es un archivo.${SIN}\n\n"

# ── 1. Lo que tiene que estar ────────────────────────────────────────────────
paso "Comprobando lo necesario"

command -v git >/dev/null 2>&1 || morir "Falta git." "En Termux: pkg install git   ·   En Debian/Ubuntu: sudo apt install git"
command -v node >/dev/null 2>&1 || morir "Falta Node.js." "Instálalo desde https://nodejs.org o con 'pkg install nodejs-lts' en Termux."
command -v npm >/dev/null 2>&1 || morir "Falta npm (viene con Node.js)."

VERSION_NODE="$(node -v | sed 's/^v//')"
MAYOR="${VERSION_NODE%%.*}"
RESTO="${VERSION_NODE#*.}"
MENOR="${RESTO%%.*}"
if [ "$MAYOR" -lt "$MIN_NODE_MAJOR" ] || { [ "$MAYOR" -eq "$MIN_NODE_MAJOR" ] && [ "$MENOR" -lt "$MIN_NODE_MINOR" ]; }; then
  morir "Node $VERSION_NODE es demasiado viejo." "Hace falta Node $MIN_NODE_MAJOR.$MIN_NODE_MINOR o superior. El del sistema suele quedarse corto."
fi
bien "git y Node $VERSION_NODE"

# ── 2. El código ─────────────────────────────────────────────────────────────
if [ -d "$DIR/.git" ]; then
  paso "Actualizando $DIR"
  git -C "$DIR" fetch --quiet origin "$RAMA"
  ANTES="$(git -C "$DIR" rev-parse --short HEAD)"
  if git -C "$DIR" pull --ff-only --quiet origin "$RAMA"; then
    DESPUES="$(git -C "$DIR" rev-parse --short HEAD)"
    if [ "$ANTES" = "$DESPUES" ]; then
      bien "Ya estaba al día ($ANTES)"
    else
      bien "Actualizado: $ANTES → $DESPUES"
    fi
  else
    aviso "No se pudo actualizar solo: hay cambios locales."
    printf "${GRIS}   Revisa 'git -C %s status' y resuélvelo a mano.${SIN}\n" "$DIR"
  fi
elif [ -e "$DIR" ]; then
  morir "$DIR ya existe y no es un repositorio del bot." "Muévelo o usa ADO_DIR=/otra/ruta."
else
  paso "Descargando el bot en $DIR"
  git clone --quiet --depth 1 --branch "$RAMA" "$REPO" "$DIR"
  bien "Descargado"
fi

cd "$DIR"

# ── 3. Dependencias ──────────────────────────────────────────────────────────
paso "Instalando dependencias (esto tarda un poco: descarga sharp y sus binarios)"
npm install --no-audit --no-fund --loglevel=error
bien "Dependencias listas"

# ── 4. Los datos del dueño, fuera del repo ───────────────────────────────────
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    bien "Creado .env a partir del ejemplo"
    printf "${GRIS}   Ábrelo y pon tu número en OWNERS para ser dueño del bot.${SIN}\n"
    printf "${GRIS}   Si no lo tocas, el bot arranca con los valores de config.js.${SIN}\n"
  fi
else
  bien "Ya tenías .env: no se toca"
fi

# ── 5. Que de verdad carga ───────────────────────────────────────────────────
paso "Comprobando que el bot carga (sin abrir WhatsApp)"

# El registro va a un temporal que exista de verdad: en Termux no hay /tmp, y
# ahí es justo donde se instala esto. mktemp ya respeta TMPDIR; si no hubiera
# ningún sitio, el propio repo sirve y luego se borra.
REGISTRO="$(mktemp 2>/dev/null || printf '%s' "$DIR/.ado-verificar.log")"

if npm run --silent verificar >"$REGISTRO" 2>&1; then
  bien "Todo en su sitio"
  rm -f "$REGISTRO"
else
  aviso "El verificador encontró algo. Esto es lo último que dijo:"
  tail -n 12 "$REGISTRO" | sed 's/^/   /'
  printf "${GRIS}   El registro completo, para mirarlo con calma: %s${SIN}\n" "$REGISTRO"
  printf "${GRIS}   Se puede repetir cuando quieras con: npm run verificar${SIN}\n"
fi

# ── 6. Cómo seguir ───────────────────────────────────────────────────────────
printf "\n${VERDE}Listo.${SIN} Para arrancarlo:\n\n"
printf "   ${AZUL}cd %s${SIN}\n" "$DIR"
printf "   ${AZUL}npm start${SIN}\n\n"
printf "${GRIS}   La primera vez te pedirá tu número y un código de 8 caracteres${SIN}\n"
printf "${GRIS}   (WhatsApp → Dispositivos vinculados → Vincular con número).${SIN}\n\n"
printf "${GRIS}   Para que siga vivo al cerrar la terminal:  npm run vigia${SIN}\n"
printf "${GRIS}   Para actualizar otro día:  bash instalar.sh${SIN}\n\n"

if [ "${ADO_ARRANCAR:-0}" = "1" ]; then
  paso "Arrancando"
  exec npm start
fi
