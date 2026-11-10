<div align="center">

<img src="https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg" width="190" alt="Levi-Bot"/>

# ⚔️ Levi-Bot

**El bot de WhatsApp multi-dispositivo, modular y sin cajas negras.**

Se conecta con Baileys, arranca con un código de vinculación y cada comando es
un archivo que puedes leer, cambiar o borrar.

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/SergioOficial/Levi-bot)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-%40itsliaaa%2Fbaileys-blue?style=for-the-badge)](https://www.npmjs.com/package/@itsliaaa/baileys)
[![Comandos](https://img.shields.io/badge/Comandos-374-informational?style=for-the-badge)](#-comandos)
[![Licencia](https://img.shields.io/badge/Licencia-AGPL--3.0-blue?style=for-the-badge)](LICENSE)

**Creado por [Jeferson Fernández](https://github.com/levi-hub805) en colaboración con [Sergio Gómez Gort](https://github.com/SergioOficial) y [riokuroxi-svg](https://github.com/riokuroxi-svg)**

[Qué es](#-qué-es-levi-bot) • [Instalación](#-instalación) • [Estructura](#️-estructura-del-proyecto) • [Comandos](#-comandos) • [Licencia](#-licencia) • [Créditos](#-créditos)

</div>

---

## ✨ Qué es Levi-Bot

| Lo que trae | Para qué sirve |
|---|---|
| 🧩 **Todo es un plugin** | Cada comando es un archivo en `plugins/`. Se carga solo, sin tocar `index.js`. Si borras el archivo, el comando desaparece del menú. |
| 🔀 **Multi-prefijo** | Responde a `.`, `#`, `/` y 🇨🇺 a la vez. Se cambia en `config.js`. |
| 🕵️ **Modo privado** | `.menu-` con un guion al final: borra tu mensaje del grupo y te contesta por privado. |
| 🔘 **Botones nativos** | Respuesta rápida, copiar, enlace, llamar, ubicación, mini web y **listas desplegables**, con los nodos binarios que WhatsApp exige y respaldo en texto si el móvil no los pinta. Se apagan con `BOTONES=off` sin tocar código. |
| 📅 **Versión de WhatsApp al día** | La revisión se pregunta a WhatsApp (`web.whatsapp.com`), no al repositorio del cliente. Eso es lo que evita el cierre «actualiza WhatsApp». |
| 💎 **Premium y sub-bots** | Clones del bot vinculando otros números, con sus propios owners. |
| 🎨 **Multimedia sin romperse** | Descargas de Pinterest, TikTok, Facebook y YouTube con compresión (`sharp`) para que no falle la subida. |
| 🧠 **IA, economía y RPG** | Texto, imágenes y notas de voz; monedas con banco y caja fuerte; niveles, caza, pesca y minería. |
| 🛡️ **Freno de envíos** | Cola única, espera variable, calentamiento diario y vigilante de riesgo. Sin prometer que la cuenta no sea bloqueada. |
| ✅ **Se puede comprobar** | Cuatro scripts dicen si el bot está bien **sin abrir WhatsApp**. |

---

## 🛠️ Instalación

Requisitos en todos los casos: **Node.js 20 o superior**, `git` y conexión a
internet. Nada más.

### 📱 Termux (Android) — paso a paso

1. Instala Termux **desde F-Droid o GitHub**, no desde Play Store (esa versión
   está abandonada y no actualiza paquetes).

   ```text
   https://f-droid.org/es/packages/com.termux/
   ```

2. Abre Termux y actualiza los paquetes base:

   ```bash
   pkg update && pkg upgrade -y
   ```

3. Instala lo necesario. `python`, `make` y `clang` no son adorno: un paquete
   del cliente es nativo y en ARM se compila.

   ```bash
   pkg install git nodejs-lts python make clang ffmpeg libvips -y
   ```

4. Evita que Android duerma el bot cuando apagues la pantalla:

   ```bash
   termux-wake-lock
   ```

5. Descarga el bot y entra en la carpeta:

   ```bash
   git clone https://github.com/SergioOficial/Levi-bot.git
   cd Levi-bot
   ```

6. Instala las dependencias. En un móvil esto tarda **entre 10 y 25 minutos** y
   parece colgado: está compilando. No cierres Termux.

   ```bash
   npm install
   ```

7. Comprueba que todo está en su sitio (no abre WhatsApp todavía):

   ```bash
   npm run verificar
   ```

8. Arranca:

   ```bash
   npm start
   ```

9. Escribe tu número con código de país cuando lo pida, sin `+` ni espacios
   (ejemplo: `5215512345678`), y usa el código de 8 caracteres que aparece en
   WhatsApp → **Dispositivos vinculados** → **Vincular con número de teléfono**.

10. Para que siga vivo al cerrar Termux, déjalo en segundo plano:

    ```bash
    nohup npm start > bot.log 2>&1 &
    tail -f bot.log
    ```

### 🖥️ Servidor VPS (Ubuntu / Debian) — paso a paso

1. Entra por SSH y actualiza:

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Instala Node 20 (el de los repositorios suele ser viejo) y las herramientas
   de compilación:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git build-essential python3 ffmpeg libvips-dev
   node -v   # debe decir v20.x o superior
   ```

3. Descarga el bot:

   ```bash
   git clone https://github.com/SergioOficial/Levi-bot.git
   cd Levi-bot
   ```

4. Crea el archivo `.env` con tu número, para que no lo pregunte por consola:

   ```bash
   echo "WHATSAPP_NUMBER=5215512345678" > .env
   ```

5. Instala y comprueba:

   ```bash
   npm install
   npm run verificar
   ```

6. Arranca con un vigilante que lo levanta si se cae (`pm2`):

   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name levi-bot
   pm2 logs levi-bot        # aquí sale el código de vinculación
   pm2 save && pm2 startup  # que arranque solo si reinicias el servidor
   ```

   Sin `pm2`, basta `npm start` dentro de `tmux` o `screen`.

### ☁️ Hosting con panel (BotKeep, Railway, Pterodactyl…)

1. Sube el repositorio a tu cuenta (o haz un fork) y conéctalo al panel.
2. Pon el proyecto en **Node 20**.
3. En *Variables de entorno* añade:
   - `WHATSAPP_NUMBER` — tu número con código de país.
   - `GITHUB_TOKEN` — opcional, solo para `.reporte` e `.invite`.
   - `BOTONES=off` — opcional, manda los menús como texto sin botones.
   - `BOTONES_VIEWONCE=1` — opcional, vuelve al envoltorio viejo de los interactivos.
4. Comando de inicio: `npm start` (o `node index.js`).
5. Mira los **logs** del panel para copiar el código de vinculación.

### 🔄 Actualizar el bot

Desde WhatsApp, con el bot encendido: `.fix` (solo dueños). Si hay cambios
locales sin subir, avisa y **no toca nada** hasta que lo confirmes otra vez; el
parche queda guardado en `tmp/`.

A mano:

```bash
git pull
npm install          # solo si cambió package.json
npm start
```

### ⚠️ Antes de usar una cuenta

Usa un número secundario, no el tuyo personal. Ningún bot puede garantizar que
una cuenta no sea bloqueada; este lleva freno de ritmo, calentamiento y
vigilancia (míralo con `.warmup`), que baja el riesgo pero no lo elimina.

## 🧪 Comprobar que está bien (sin abrir WhatsApp)

| Comando | Qué hace |
|---|---|
| `npm run verificar` | Cliente, botones, versión de WhatsApp, sintaxis, carga real de los 124 plugins y owners. |
| `npm run probar` | 81 pruebas: recordatorios, encuestas, morse, red segura, economía, fechas y actividad. |
| `npm run humo` | Llama a los 90 plugins con un contexto falso y señala los que revientan (los que borran archivos o reinician no se ejecutan nunca). |
| `npm run auditar` | Qué comandos dependen de una API externa y qué archivo no existe. Informe en [docs/COMANDOS.md](docs/COMANDOS.md). |

Si algo falla, ahí se ve si el problema es del bot o de la sesión — antes de
culpar al teléfono. ¿Actualizaste y algo se rompió? Punto de retorno:
**[docs/RETORNO.md](docs/RETORNO.md)**.

---

## 🏗️ Estructura del proyecto

```text
Levi-bot/
├── index.js              # Núcleo: conexión, multi-prefijo, router y vigilante
├── pluginLoader.js       # Escáner de comandos y eventos
├── config.js             # Prefijos, owners, nombre del bot, footer
├── lib/                  # Lo compartido, sin duplicar en cada plugin
│   ├── baileys.js        #   cliente único (fork por defecto, con respaldo)
│   ├── wa-version.js     #   versión de WhatsApp Web preguntada a WhatsApp
│   ├── botones.js        #   botones nativos + respaldo en texto
│   ├── wa-nodes.js       #   nodos binarios que exigen los mensajes con botones
│   ├── encuestas.js      #   encuesta, quiz y voto múltiple nativos
│   ├── recordatorios.js  #   avisos que sobreviven al reinicio
│   ├── grupo.js          #   administradores, menciones y objetivos
│   ├── actividad.js      #   contador de quién habla en cada grupo
│   ├── economia.js       #   apuestas, plazos y formato del dinero
│   ├── consultas.js      #   APIs externas con plazo y error claro
│   ├── antiban.js        #   cola de envíos, ritmo, calentamiento y vigilante
│   ├── red-segura.js     #   pedir URLs sin abrir la red interna
│   ├── rutas.js          #   una sola ruta para las carpetas de datos
│   └── database.js       #   base JSON con autoguardado
├── plugins/              # ¡El corazón del bot!
│   ├── admin/            # kick, promote, warn, antilink, setgp, pin, actividad
│   ├── descargas/        # play, pinterest, tiktok, fb, gitclone
│   ├── economia/         # daily, weekly, work, bal, dep, coffer, ruleta, casino
│   ├── fun/              # meme, gato, trivia, 8ball, ship
│   ├── ia/               # ia, iaaudio, imagen
│   ├── info/             # menu, allmenu, ping, health, creadores
│   ├── owner/            # fix, restart, backup, exec, block, getplugin
│   ├── perfil/           # reg, perfil, level, lboard, afk, ficha
│   ├── premium/          # canjear
│   ├── rpg/              # cazar, pescar, minar, explorar
│   ├── stickers/         # sticker, brat
│   ├── subbots/          # code, jadibot, stopbot, bots
│   ├── test/             # botones de prueba
│   └── utils/            # qr, morse, encuesta, recordar, say, get, pfp, crypto
├── pruebas/              # Pruebas que corren sin abrir WhatsApp
├── scripts/              # verificar · probar · humo · auditar · mapa-porte
└── docs/                 # CLIENTE · COMANDOS · PORTE · RETORNO
```

---

## ⚙️ Configuración (`config.js`)

```javascript
export const config = {
  // 🔥 El bot responde a cualquiera de estos prefijos
  prefix: [".", "#", "/", "🇨🇺"],

  botName: "Levi-Bot ⚔️",

  owners: [
    { name: "Sergio Gómez Gort",      number: "5358090650" },
    { name: "Jeferson Fernández",     number: "573005255807" },
    { name: "José Rodríguez",         number: "584245610338" },
    { name: "atencion al cliente bots", number: "50494874330" }
  ],

  version: "1.0.5",
  footer: "Levi-Bot by Wyra Studios"
};
```

> Los comandos con `isOwner` (`.restart`, `.exec`, `.fix`, `.backup`, `.getplugin`…)
> solo los usan los números de `owners`. Si un comando de administrador no
> funciona, comprueba que el bot sea admin del grupo: el propio comando lo dice
> cuando no puede.

---

## 🧩 Comandos

Prefijo de ejemplo `.`. Casi todos tienen alias en español (`#diario`, `#robar`,
`#fijar`…): la lista completa está en [`docs/COMANDOS.md`](docs/COMANDOS.md) y en
el propio WhatsApp con `.allmenu` y `.menucat`. Los números cuentan nombres, alias
incluidos.

| Categoría | Comandos | Ejemplos |
|---|:--:|---|
| 🛡️ **Admin** | 43 | `kick` `promote` `demote` `warn` `warns` `antilink` `hidetag` `bot off` `link` `revoke` `setgpname` `setgpdesc` `setgpbanner` `pin` `gp` `count` `topcount` `topinactive` |
| 🧾 **Perfil** | 24 | `reg` `perfil` `level` `lboard` `afk` `setdesc` `setgenre` `sethobby` `setbirth` `delperfil` |
| 💰 **Economía** | 54 | `daily` `weekly` `monthly` `work` `beg` `bal` `dep` `with` `pay` `rob` `cf` `slots` `dice` `ppt` `roulette` `casino` `coffer` `rankcoins` `einfo` |
| ⚔️ **RPG** | 12 | `trabajar` `cazar` `pescar` `minar` `explorar` `clase` `ranknivel` `reiniciarrpg` |
| 📥 **Descargas** | 25 | `play` `mp3` `tt` `fb` `pinterest` `toimg` `ytsearch` `gitclone` `gitsearch` `gituser` |
| 🖌️ **Stickers** | 5 | `sticker` `brat` `searchsticker` |
| 🧠 **IA** | 9 | `ia` `iaaudio` `imagen` |
| 🎉 **Fun** | 22 | `trivia` `mate` `8ball` `meme` `gato` `perro` `waifu` `ship` `r` |
| ℹ️ **Info** | 32 | `menu` `allmenu` `menucat` `ping` `info` `creadores` `health` `runtime` `cache` `lid` `reporte` |
| 🔔 **Utilidades** | 70 | `ping` `info` `menu` `allmenu` `health` `traducir` `clima` `wiki` `tts` `qr` `morse` `demorse` `encuesta` `say` `read` `recordar` `pfp` `wastalk` `crypto` `letra` `acortar` `tourl` `tag` |
| 🤖 **Sub-bots** | 13 | `code` `jadibot` `stopbot` `bots` `addowner` `delowner` |
| 💎 **Premium** | 2 | `canjear` |
| 👑 **Owner** | 61 | `fix` `restart` `reload` `backup` `exec` `getplugin` `nuevo` `delplugin` `block` `unblock` `blocklist` `botsesion` `setbotname` `setbotpp` `clear` `warmup` `antiban` |
| 🧪 **Test** | 7 | `botones` `boton1`…`boton6` |

💡 Cualquier comando funciona en **modo privado** con un guion al final: `.menu-`.

---

## 🔧 Novedades de esta versión

- 🔖 **Menú con guía rápida**: la leyenda de símbolos del menú de Shin-MD
  (Ⓓ Dueño · Ⓟ Premium · Ⓐ Admin · Ⓖ Grupos · Ⓛ Límite) y su crédito, con el
  texto tal cual lo escribió su autor. Las marcas **no van a mano**: se leen de
  los plugins cargados, así que un comando solo lleva Ⓓ si de verdad es de dueño
  y Ⓐ si de verdad pide administrador; sin bandera, sin marca.
- 🔘 **Botones de Shin-MD portados**: el menú ya lleva la lista desplegable
  («Explorar categorías», «Categorías (.menucat)», «Ver todo»). Tres cosas que se
  arreglaron al portarlos: **ya no se envuelve en `viewOnceMessage`** (era lo que
  dejaba los botones grises o invisibles en WhatsApp Web), se mandan los **nodos
  binarios** que WhatsApp exige (`lib/wa-nodes.js`; sin ellos el servidor acepta
  el mensaje y el teléfono no pinta nada) y **más de tres botones piden la hoja
  inferior** en vez de perderse en silencio. Interruptores: `BOTONES=off` los
  apaga todos y `BOTONES_VIEWONCE=1` recupera el envoltorio viejo.
- 🛡️ **Anti-ban portado de Shin-MD** (`lib/antiban.js`): una sola cola para todos
  los envíos, con espera al azar (no fija) entre mensajes, más espera en los
  textos largos, y **calentamiento diario** (una cuenta nueva no manda 500
  mensajes el primer día; el tope sube durante una semana y se guarda en la base,
  así que reiniciar no lo pone a cero). Si la conexión se cae, el mensaje espera
  y sale al volver; si un envío se queda sin respuesta, **no se repite** — mejor
  perder uno que mandar dos iguales. Un vigilante mide el riesgo (desconexiones,
  errores, fallos y un 403), pausa los envíos a partir de 80 y reconecta a partir
  de 95, con tope de 3 intentos para no caer en un bucle. Se mira con `.warmup`.
- 💰 **Economía completa**: `.weekly` y `.monthly` con racha y techo, `.roulette`
  con la ruleta europea de verdad (×2 color y paridad, ×36 número, el 0 para la
  casa), `.ppt`, `.casino` y `.coffer` — lo que guardas en la caja fuerte no lo
  alcanza `.rob`, y no da intereses (no se fabrica dinero).
- 🛡️ **Administración de grupo**: cambiar nombre, descripción y foto
  **comprobando** que WhatsApp lo aplicó; enlace e `invite` con revocación;
  fijar mensajes; `.count`, `.topcount` y `.topinactive` con contador propio; y
  `.bot off` que apaga el bot de verdad (lo respeta el router, no cada plugin).
- 🧾 **Perfil**: descripción, género, afición y cumpleaños con validación de
  fecha real (rechaza 32/13 y 29 de febrero cuando no toca), `.level`, `.lboard`
  y `.afk` que avisa cuando te mencionan y se quita solo al escribir.
- 🔔 **Utilidades con API probada**: `.crypto` (precio en dólares y pesos),
  `.letra`, `.acortar` y `.tourl`. Si un servicio no responde, el comando lo dice:
  nunca enseña un dato viejo como si fuera de ahora.
- 👑 **Owner**: `.getplugin` para leer un plugin desde el móvil, `.nuevo` y
  `.delplugin` para crearlos y borrarlos con confirmación, `.botinfo`,
  `.blocklist` y `.block`/`.unblock` comprobados contra la lista real.
- 🩺 **Diagnóstico**: `.health`, `.runtime`, `.status`, `.lid` y `.cache` con
  datos medidos (RAM, tiempo encendido, tamaño de la base).
- 🧪 **`npm run humo`**: llama a los plugins con un contexto falso y caza los que
  revientan — lo que `node --check` no ve.
- 🛠️ **`.fix` ya no borra tu trabajo**: si hay cambios sin subir, guarda un
  parche en `tmp/` y pide confirmación antes de tocar nada.
- 🧩 **Un solo sitio para el cliente**: todo importa de `lib/baileys.js`, con
  `@itsliaaa/baileys` por defecto y respaldo automático al oficial si no carga.
- 📄 **Licencia AGPL-3.0** con `NOTICE` de procedencia: ver [Licencia](#-licencia).

---

## 📄 Licencia

Este proyecto se distribuye bajo **GNU AGPL-3.0** (archivo [`LICENSE`](LICENSE),
texto completo de la Free Software Foundation).

**Qué obliga, en corto** (el texto de `LICENSE` manda):

1. Si distribuyes el bot, tienes que entregar también el código fuente.
2. Si lo ofreces como servicio por red, quien lo use tiene derecho a pedir el código de la versión que corre.
3. Las modificaciones se mantienen bajo AGPL-3.0 y hay que decir qué se cambió.
4. Hay que conservar los avisos de copyright y el archivo [`NOTICE`](NOTICE).

**Procedencia, sin adornos** — el detalle está en [`NOTICE`](NOTICE):

| Parte | Autoría | Licencia |
|---|---|---|
| Levi-Bot (base original) | Jeferson Fernández y Sergio Gómez Gort | el repo no traía archivo de licencia; su `package.json` declaraba **ISC** |
| Comandos portados de [Shin-MD](https://github.com/riokuroxi-svg/Shin-MD) | riokuroxi-svg | **AGPL-3.0-only** (los archivos portados llevan su cabecera) |
| Cliente de WhatsApp | `@itsliaaa/baileys` · respaldo `@whiskeysockets/baileys` | **MIT** (dependencias declaradas, no código incluido) |

Lo portado de Shin-MD no se puede relicenciar: entra con su AGPL, y por eso el
conjunto queda en AGPL-3.0. Cada archivo que viene de ahí lo dice en su primera
línea.

---

## 🤝 Créditos

<div align="center">

<table>
  <tr>
    <td align="center" width="33%">
      <a href="https://github.com/levi-hub805">
        <img src="https://github.com/levi-hub805.png" width="100" alt="Jeferson"/><br/>
        <b>Jeferson Fernández</b><br/>
        <sub>💫 Creador y Lead Developer</sub>
      </a><br/><br/>
      <a href="https://wa.me/573005255807">
        <img src="https://img.shields.io/badge/WhatsApp-+57 300 525 5807-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp Jeferson"/>
      </a>
    </td>
    <td align="center" width="33%">
      <a href="https://github.com/SergioOficial">
        <img src="https://github.com/SergioOficial.png" width="100" alt="Sergio"/><br/>
        <b>Sergio Gómez Gort</b><br/>
        <sub>🔧 Colaborador y Mantenimiento</sub>
      </a><br/><br/>
      <a href="https://wa.me/5358090650">
        <img src="https://img.shields.io/badge/WhatsApp-+53 580 906 50-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp Sergio"/>
      </a>
    </td>
    <td align="center" width="33%">
      <a href="https://github.com/riokuroxi-svg">
        <img src="https://github.com/riokuroxi-svg.png" width="100" alt="riokuroxi-svg"/><br/>
        <b>riokuroxi-svg</b><br/>
        <sub>🧩 Colaborador — comandos de Shin-MD</sub>
      </a><br/><br/>
      <a href="https://github.com/riokuroxi-svg/Shin-MD">
        <img src="https://img.shields.io/badge/GitHub-Shin--MD-181717?style=flat&logo=github&logoColor=white" alt="Shin-MD"/>
      </a>
    </td>
  </tr>
</table>

📚 Cliente base: `@itsliaaa/baileys` (respaldo automático a `@whiskeysockets/baileys`)

---

⭐ Si te gusta el proyecto, dale una estrella ⭐

Hecho con 💫 desde Cuba para el mundo

[![Repositorio](https://img.shields.io/badge/Repositorio-Oficial-181717?style=flat&logo=github&logoColor=white)](https://github.com/SergioOficial/Levi-bot)

</div>
