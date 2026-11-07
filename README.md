<div align="center">

# ⚔️ Levi-Bot

### Bot de WhatsApp Multi-Device con Arquitectura de Plugins (Baileys)

<img src="https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg" width="180" alt="Levi-Bot"/>

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/levi-hub805/Levi-bot-)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-7.0.x-blue?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Creado por [Jeferson Fernández](https://github.com/levi-hub805) en colaboración con [Sergio Gómez Gort](https://github.com/SergioOficial)**

</div>

---

## 🚀 Últimas Novedades (Update Masivo)

Hemos reescrito la arquitectura del bot para hacerlo **100% modular** y lleno de funciones. Estas son las actualizaciones más recientes:

- 🕵️‍♂️ **Modo Privado (`-`)**: Escribe cualquier comando terminado en guion (ej. `.menu-`) y el bot borrará tu mensaje del grupo y te responderá **solo a tu privado**.
- 🎨 **Nuevo Diseño (Neko Club)**: El menú y los perfiles ahora tienen un diseño minimalista, mostrando estadísticas dinámicas (tipo de bot, usuarios registrados, nivel, EXP y rango Premium/Free).
- 🎮 **Expansión RPG**: Nuevos comandos para subir de nivel (`cazar`, `pescar`, `minar`, `explorar`).
- 🧠 **Juegos de Trivia**: Juega con `.trivia` o `.mate`, responde con `.r` (o `.responder`) y gana coins.
- 🖼️ **Descargas Blindadas**: Todos los comandos de imágenes (Pinterest, Gatos, Memes, Anime) ahora usan `axios` y `sharp` para comprimir las imágenes antes de enviarlas, **solucionando el error `Media upload failed`**.
- 🛡️ **Herramientas de Admin**: Comandos `.close`, `.open` y `.del` para gestionar grupos (mejorados para evitar fallos con LIDs).
- 💎 **Sistema Premium**: Canjea códigos con `.canjear` para obtener acceso al comando `.jadibot` (Prem-Bots).
- ⚡ **Recarga en Caliente**: El comando `.fix` hace `git pull` y recarga los plugins sin reiniciar el bot.

---

## ⚠️ Errores Conocidos y Soluciones

### 🎵 Errores en `#play` (YouTube)
- **Problema:** YouTube cambia constantemente sus algoritmos, causando bloqueos de IP o fallos en el envío del audio.
- **Solución:** Se ha integrado `play-dl` y `axios` con cabeceras personalizadas para intentar evadir los bloqueos. Si falla, intenta con otra canción o verifica la conexión de red.

---

## 📁 Estructura del Proyecto (Modular)

```text
Levi-bot-/
├── index.js              # Núcleo (Conexión Baileys + Cargador de plugins)
├── pluginLoader.js       # Buscador y cargador de comandos
├── database.js           # Sistema de base de datos JSON auto-guardable
├── database.json         # Datos de usuarios (NO SUBIR A GITHUB)
├── config.js             # Configuración global (Prefijo, Owners, etc.)
├── package.json          # Dependencias
└── plugins/              # ¡Aquí viven todos los comandos!
    ├── info/             # menu, ping, info, creadores, reporte
    ├── economia/         # daily, work, bal, rankcoins
    ├── rpg/              # trabajar, cazar, pescar, minar, explorar, clase
    ├── perfil/           # reg, perfil, delperfil
    ├── descargas/        # play, pinterest, ytsearch, tiktok, facebook
    ├── stickers/         # sticker, brat, stickers (búsqueda)
    ├── ia/               # ia, iaaudio, imagen
    ├── fun/              # trivia, mate, meme, ship, anime, gato, perro
    ├── utils/            # del, close, open, qr, clima, wiki, traducir, tts
    ├── subbots/          # code, jadibot, stopbot, bots
    ├── premium/          # canjear
    └── owner/            # fix, gencode, addpremium, setbotname, backup
```

---

🚀 Instalación en Termux (Android)

1️⃣ Actualizar paquetes e instalar dependencias del sistema

```bash
pkg update && pkg upgrade -y
```
```
pkg install git nodejs-lts ffmpeg libvips -y
```

2️⃣ Clonar el repositorio

```bash
git clone https://github.com/levi-hub805/Levi-bot-.git
cd Levi-bot-
```

3️⃣ Instalar dependencias de Node

```bash
node index.js
```

⚠️ Nota sobre sharp en Termux: Si tienes problemas de compilación, ejecuta:

```bash
npm install @img/sharp-wasm32 --force
npm install sharp --force
```

4️⃣ Iniciar el bot

```bash
npm start
```

---

💻 Instalación en PC / VPS / BotKeep

```bash
git clone https://github.com/levi-hub805/Levi-bot-.git
cd Levi-bot-
npm install
npm start
```

Al arrancar por primera vez te pedirá tu número de WhatsApp y generará un código de vinculación de 8 dígitos.

En WhatsApp ve a Dispositivos vinculados → Vincular con número de teléfono e ingresa el código sin guiones ni espacios.

---

⚙️ Configuración (config.js)

```javascript
export const config = {
  prefix: "#",
  botName: "Levi-Bot ⚔️",

  // Lista de owners (múltiples)
  owners: [
    { name: "Sergio Gómez Gort",  number: "5358090650" },
    { name: "Jeferson Fernández", number: "573005255807" },
    { name: "Soport", number: "5358275267" },
    { name: "atencion al cliente bots", number: "50494874330" }
  ],

  // Compatibilidad con el resto del código
  ownerName: "Sergio Dev & Jeferson Fernández 💫",
  ownerNumber: "5358090650",

  version: "1.0.5",
  footer: "Levi-Bot by Jeferson Fernández from Sergio Gómez Gort",

  // CLAVES DE API
  apis: {
    vihangayt: "lSq1epGYexsn4WmS"
  }
};
```

---

🧩 Comandos Principales

Categoría Comandos
🎮 RPG trabajar, cazar, pescar, minar, explorar, clase, ranknivel
💰 Economía daily, work, bal, rankcoins
🧾 Perfil reg, perfil, delperfil
🎨 Descargas play, pinterest (o pin), tt (TikTok), fb, ytsearch, toimg
🖌️ Stickers s (o sticker), brat, stickers
🧠 IA ia, iaaudio, imagen
🎮 Juegos trivia, mate, 8ball, ship, meme, gato, perro, neko
🛡️ Admin close, open, del
⚙️ Utilidades menu, ping, info, traducir, clima, qr, tts, wiki, fix, reporte
🤖 Subbots/Prem code (Gratis), jadibot <num> (Premium), bots, stopbot, canjear
👑 Owners gencode, addpremium, delpremium, backup

Tip: Recuerda que puedes usar cualquier comando en el grupo de forma privada añadiendo un - al final (Ej: .menu-).

---

🤝 Créditos y Contacto

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/levi-hub805">
        <img src="https://github.com/levi-hub805.png" width="100" alt="Jeferson"/><br/>
        <b>Jeferson Fernández</b><br/>
        <sub>💫 Creador y desarrollador</sub>
      </a><br/><br/>
      <a href="https://wa.me/573005255807">
        <img src="https://img.shields.io/badge/WhatsApp-+57 300 525 5807-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp Jeferson"/>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/SergioOficial">
        <img src="https://github.com/SergioOficial.png" width="100" alt="Sergio"/><br/>
        <b>Sergio Gómez Gort</b><br/>
        <sub>Colaborador y mantenimiento</sub>
      </a><br/><br/>
      <a href="https://wa.me/5358090650">
        <img src="https://img.shields.io/badge/WhatsApp-+53 580 906 50-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp Sergio"/>
      </a>
    </td>
  </tr>
</table>

<div align="center">

📚 Librería base: @whiskeysockets/baileys

---

⭐ Si te gusta el proyecto, dale una estrella ⭐

Hecho con 💫 desde Cuba para el mundo

https://img.shields.io/badge/Repositorio-Levi--bot--181717?style=flat&logo=github&logoColor=white

</div>
