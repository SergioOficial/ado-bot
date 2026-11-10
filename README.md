<div align="center">

# ⚔️ Levi-Bot

### El Bot de WhatsApp Multi-Device Definitivo

<img src="https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg" width="200" alt="Levi-Bot"/>

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/levi-hub805/Levi-bot-)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-7.0.x-blue?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge)](LICENSE)

**Creado por [Jeferson Fernández](https://github.com/levi-hub805) en colaboración con [Sergio Gómez Gort](https://github.com/SergioOficial)**

[Características](#-características-principales) • [Instalación](#️-instalación-y-despliegue) • [Estructura](#️-arquitectura-modular) • [Comandos](#-comandos-principales) • [Licencia](#-licencia)

</div>

---

## 🚀 Características Principales

Levi-Bot ha sido reescrito desde cero para ser **100% modular, escalable y ultrarrápido**.

- 🧩 **Arquitectura de Plugins y Eventos**: Añade comandos o escucha eventos (como bienvenidas o antilink) simplemente creando un archivo en la carpeta `plugins/`. No necesitas tocar el `index.js` nunca más.
- 🔀 **Sistema Multi-Prefijo**: El bot responde a múltiples prefijos a la vez (ej. `.`, `#`, `/`, `🇨🇺`). Tú decides cuáles usar en el `config.js`.
- 🕵️‍♂️ **Modo Privado (Silencioso)**: Escribe cualquier comando en un grupo añadiendo un guion al final (ej. `.menu-`) y el bot borrará tu mensaje del grupo y te responderá solo a tu chat privado.
- 💎 **Sistema Premium y Sub-Bots**: Crea clones del bot vinculando otros números con `#jadibot` (exclusivo para usuarios Premium), o crea tu propio sub-bot con `#code`.
- 🎨 **Multimedia Blindado**: Descargas de Pinterest (álbumes), TikTok, Facebook y YouTube usando `axios` y `sharp` para comprimir imágenes y evitar el error `Media upload failed`.
- 🧠 **IA Integrada**: Generación de texto, imágenes y notas de voz con Inteligencia Artificial directamente en el chat.
- 🎮 **Economía y RPG**: Sistema completo de coins, banco, apuestas, niveles y trabajos.

---

## 🏗️ Arquitectura Modular

El bot está diseñado para que trabajes de forma ordenada. Esta es la estructura de tu proyecto:

```text
Levi-bot/
├── index.js              # Núcleo (conexión, multi-prefijo, ejecutor y vigilante)
├── pluginLoader.js       # Escáner dinámico de comandos y eventos
├── config.js             # Prefijos, owners, nombre del bot, footer
├── .env                  # Variables de entorno (NO SUBIR A GITHUB)
├── lib/                  # Lo compartido, sin duplicar en cada plugin
│   ├── baileys.js        #   cliente único (fork u oficial, se elige aquí)
│   ├── wa-version.js     #   versión de WhatsApp Web preguntada a WhatsApp
│   ├── botones.js        #   botones nativos + respaldo en texto
│   ├── encuestas.js      #   encuesta, quiz y voto múltiple nativos
│   ├── recordatorios.js  #   avisos que sobreviven al reinicio
│   ├── grupo.js          #   administradores, menciones y advertencias
│   ├── red-segura.js     #   pedir URLs sin abrir la red interna
│   ├── rutas.js          #   una sola ruta para las carpetas de datos
│   └── database.js       #   base JSON con autoguardado (lib/database.json)
├── plugins/              # ¡El corazón del bot!
│   ├── admin/            # kick, promote, demote, warn, antilink, hidetag
│   ├── descargas/        # play, pinterest, tiktok, fb, gitclone
│   ├── economia/         # daily, work, bal, dep, slots, cf
│   ├── fun/              # meme, gato, trivia, 8ball
│   ├── ia/               # ia, iaaudio, imagen
│   ├── info/             # menu, ping, info, creadores
│   ├── owner/            # fix, restart, exec, error, backup
│   ├── perfil/           # reg, perfil, nivel
│   ├── rpg/              # cazar, pescar, minar, explorar
│   ├── stickers/         # sticker, brat
│   ├── subbots/          # code, jadibot, stopbot
│   └── utils/            # qr, morse, encuesta, recordar, say, get, pfp
├── pruebas/              # Pruebas que corren sin abrir WhatsApp
├── scripts/              # verificar · probar · auditar · mapa-porte
└── docs/                 # CLIENTE · COMANDOS · PORTE · RETORNO
```

---

## 🛠️ Instalación y Despliegue

### 📱 En Termux (Android)

```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts ffmpeg libvips python make clang -y

git clone https://github.com/SergioOficial/Levi-bot.git
cd Levi-bot
npm install
npm run verificar
npm start
```

> `python`, `make` y `clang` no son adorno: `better-sqlite3` (que necesita el
> cliente `@itsliaaa/baileys`) es un módulo nativo y en ARM se compila. En Linux
> de 64 bits baja ya compilado y no hacen falta.

Si `sharp` falla en Termux:

```bash
npm install @img/sharp-wasm32 --force
npm install sharp --force
```

### 💻 En hosting (BotKeep / VPS)

1. Sube el repositorio a tu hosting.
2. Variables de entorno en el panel:
   - `WHATSAPP_NUMBER` — tu número con código de país (ej. `5354386852`). Sin esto, el bot lo pide por consola.
   - `GITHUB_TOKEN` — opcional, para `.reporte` e `.invite`.
   - `BAILEYS_PACKAGE` — opcional: `@whiskeysockets/baileys` para usar el cliente oficial en vez del fork.
3. Comando de inicio: `npm start`.

### 🔌 Elegir el cliente de WhatsApp

Por defecto se usa **`@itsliaaa/baileys`** (fork de Baileys v7). Para volver al
oficial sin tocar código:

```bash
BAILEYS_PACKAGE=@whiskeysockets/baileys npm start
```

Si el fork no está instalado o no carga, el bot arranca con el oficial y lo dice
en el log. Detalle de por qué y qué cambia: **[docs/CLIENTE.md](docs/CLIENTE.md)**.

### ✅ Comprobar que todo está bien (sin abrir WhatsApp)

```bash
npm run verificar   # cliente, botones, versión de WhatsApp, plugins y owners
npm run probar      # 38 pruebas: recordatorios, encuestas, morse, red segura
npm run auditar     # qué comandos dependen de una API externa (docs/COMANDOS.md)
npm run humo        # llama a los 90 plugins con un contexto falso y caza los que revientan
```

Si algo falla, ahí se ve si el problema es del bot o de la sesión — antes de
culpar al teléfono.

¿Actualizaste y algo se rompió? Hay un punto de retorno con instrucciones de
vuelta atrás: **[docs/RETORNO.md](docs/RETORNO.md)**.

---

## ⚙️ Configuración (config.js)

```javascript
export const config = {
  // 🔥 El bot responderá a cualquiera de estos prefijos
  prefix: [".", "#", "/", "🇨🇺"], 
  
  botName: "Levi-Bot ⚔️",

  // Lista de Owners (pueden usar comandos de administrador)
  owners: [
    { name: "Sergio Gómez Gort",  number: "5358090650" },
    { name: "Jeferson Fernández", number: "573005255807" }
  ],

  version: "2.0.0",
  footer: "Levi-Bot by Wyra Studios",
};
```

> Los comandos marcados `isOwner` (`.restart`, `.exec`, `.get`, `.backup`, `.fix`…)
> solo los pueden usar los números de `owners`. Si un comando `isAdmin` no
> funciona, comprueba que el bot sea administrador del grupo: lo dice el propio
> comando cuando no puede.

---

## 🧩 Comandos Principales

| Categoría | Comandos |
|---|---|
| 🎮 RPG | `trabajar` `cazar` `pescar` `minar` `explorar` `clase` `ranknivel` `reiniciarrpg` |
| 💰 Economía | `daily` `work` `beg` `bal` `dep` `with` `pay` `rob` `crime` `cf` `slots` `dice` `rankcoins` `nivel` |
| 🧾 Perfil | `reg` `perfil` `delperfil` |
| 🎨 Descargas | `play` `pin` (Pinterest) `tt` (TikTok) `fb` `ytsearch` `toimg` `gitclone` `gitsearch` `gituser` |
| 🖌️ Stickers | `s` `sticker` `brat` `stickers` |
| 🧠 IA | `ia` `iaaudio` `imagen` |
| 🎉 Juegos | `trivia` `mate` `8ball` `meme` `gato` `perro` `waifu` `ship` `r` |
| 🔔 Utilidades | `ping` `info` `creadores` `traducir` `clima` `wiki` `tts` `qr` `morse` `demorse` `encuesta` `say` `read` `recordar` `pfp` `wastalk` |
| 🛡️ Admin | `close` `open` `del` `tag` `hidetag` `kick` `promote` `demote` `warn` `warns` `delwarn` `setwarnlimit` `antilink` `welcome` |
| 🤖 Sub-bots | `code` `jadibot` `stopbot` `bots` `canjear` |
| 👑 Owner | `fix` `restart` `backup` `exec` `error` `invite` `gencode` `get` `botsesion` `setbotname` `setbotpp` `clear` |

💡 Tip: Recuerda que puedes usar cualquier comando en modo privado añadiendo un - al final (Ej: `.menu-`).

> Las categorías del menú en WhatsApp las pinta el propio bot: `.menu`, `.menu admin`, `.menu utils`, `.menu owner`…

---

## 🔧 Cambios de esta versión

- 🧩 **Un solo sitio para el cliente**: todo importa de `lib/baileys.js`. Por defecto `@itsliaaa/baileys` y, si no carga, cae al oficial diciéndolo. Se cambia con `BAILEYS_PACKAGE=@whiskeysockets/baileys`.
- 📅 **Versión de WhatsApp Web preguntada a WhatsApp** (`lib/wa-version.js`). La del paquete iba un mes por detrás y eso es lo que provoca el cierre «client out of date» que la gente lee como «actualiza WhatsApp».
- 🔘 **Botones en `lib/botones.js`** (respuesta rápida, copiar, enlace, llamar, recordatorio) con respaldo en texto si el cliente no los pinta.
- ✅ **`npm run verificar`**: seis comprobaciones sin abrir WhatsApp (cliente, botones, versión, sintaxis, carga real de los plugins, owners).
- 🧪 **`npm run humo`**: llama a los plugins con un contexto falso (sin abrir WhatsApp) y señala los que revientan; los que borran archivos o reinician no se ejecutan nunca.
- 🔎 **`npm run auditar`**: dice qué comandos dependen de una API externa y qué archivo no existe. Informe en [docs/COMANDOS.md](docs/COMANDOS.md).
- ♻️ **Reconexión con candado**: dos cierres seguidos ya no abren dos sockets a la vez.
- 🛡️ **Administración de grupo ampliada**: `.warn` `.warns` `.delwarn` `.setwarnlimit` `.kick` `.promote` `.demote` `.hidetag` y `.antilink`, con el candado de administrador en el router (no en cada plugin).
- 🧰 **Utilidades nuevas**: `.qr` (dibujado en el bot), `.morse`/`.demorse`, `.encuesta` (quiz y voto múltiple nativos), `.say`, `.read`, `.recordar` (sobrevive al reinicio), `.pfp`, `.wastalk` y `.get` (solo dueño, con filtro anti-SSRF).
- 📄 **Licencia AGPL-3.0** con `NOTICE` de procedencia: ver [Licencia](#-licencia).

Detalle en [docs/CLIENTE.md](docs/CLIENTE.md) y [docs/PORTE.md](docs/PORTE.md).

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
| Cliente de WhatsApp | `@itsliaaa/baileys` / `@whiskeysockets/baileys` | **MIT** (dependencias declaradas, no código incluido) |

Lo portado de Shin-MD no se puede relicenciar: entra con su AGPL, y por eso el
conjunto queda en AGPL-3.0. Cada archivo que viene de ahí lo dice en su primera
línea.

---

## 🤝 Créditos y Contacto

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/levi-hub805">
        <img src="https://github.com/levi-hub805.png" width="100" alt="Jeferson"/><br/>
        <b>Jeferson Fernández</b><br/>
        <sub>💫 Creador y Lead Developer</sub>
      </a><br/><br/>
      <a href="https://wa.me/573005255807">
        <img src="https://img.shields.io/badge/WhatsApp-+57 300 525 5807-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp Jeferson"/>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/SergioOficial">
        <img src="https://github.com/SergioOficial.png" width="100" alt="Sergio"/><br/>
        <b>Sergio Gómez Gort</b><br/>
        <sub> Colaborador y Mantenimiento</sub>
      </a><br/><br/>
      <a href="https://wa.me/5358090650">
        <img src="https://img.shields.io/badge/WhatsApp-+53 580 906 50-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp Sergio"/>
      </a>
    </td>
  </tr>
</table>

<div align="center">

📚 Librerías base: @itsliaaa/baileys (por defecto) · @whiskeysockets/baileys (respaldo)

---

⭐ Si te gusta el proyecto, dale una estrella ⭐

Hecho con 💫 desde Cuba para el mundo

[![Repositorio](https://img.shields.io/badge/Repositorio-Oficial-181717?style=flat&logo=github&logoColor=white)](https://github.com/SergioOficial/Levi-bot)

</div>

