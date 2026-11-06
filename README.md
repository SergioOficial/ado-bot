
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

## 🚀 Últimas Novedades (Migración a Plugins y Premium)

Hemos reescrito la arquitectura del bot para hacerlo **100% modular**. Estas son las actualizaciones más recientes:

- 🧩 **Sistema de Plugins (Modular)**: El `index.js` ahora es ligero y solo maneja la conexión. Todos los comandos viven en la carpeta `plugins/` organizados por categorías.
- 💎 **Sistema Premium**: Nuevo sistema de rangos. Los usuarios pueden canjear códigos (`#canjear`) para obtener acceso al comando `#jadibot` (Prem-Bots).
- 🤖 **Sub-Bots vs Prem-Bots**: 
  - `#code`: Crea un sub-bot con **tu propio número** (Gratis, límite de 4 por servidor).
  - `#jadibot <número>`: Crea un bot clonado para **otro número** (Exclusivo Premium/Owners).
- 🎙️ **IA de Voz**: El comando `#iaaudio` responde a tus preguntas con notas de voz generadas por IA.
- ⚡ **Recarga en Caliente**: El comando `#fix` hace `git pull` y recarga los plugins sin reiniciar el bot.
- 🗄️ **Base de Datos Local (`database.json`)**: Auto-guardado para perfiles, economía, RPG y códigos Premium.

---

## ⚠️ Errores Conocidos y Soluciones

El bot depende de servicios de terceros (APIs) y de la red de WhatsApp, por lo que a veces podemos experimentar fallos:

### 🤖 Errores al usar `#code` en grupos (LIDs)
- **Problema:** WhatsApp oculta los números en los grupos (LIDs). Usar `#code` en un grupo puede fallar con `Error 408 Connection Closed` porque el bot intenta vincular un ID inválido.
- **Solución:** Usa el comando `#code` desde el **privado del bot**. Si estás en un grupo, pide a un usuario Premium que use `#jadibot <número>`.

### 🔄 Bucle de reconexión en Subbots (Error 515)
- **Problema:** Al vincular un subbot, WhatsApp puede cerrar la conexión con el código `515` (Restart Required), haciendo que el bot se quede colgado.
- **Solución:** Ya hemos añadido un auto-reinicio en el código. Si el subbot detecta el 515, se reiniciará automáticamente sin borrar la sesión para completar la vinculación.

### 🎵 Errores en `#play` (YouTube)
- **Problema:** YouTube cambia constantemente sus algoritmos, causando errores `Timed Out` o fallos al enviar el audio.
- **Solución:** Si falla, intenta con otra canción. Si persiste, revisa las APIs de descarga en `plugins/descargas/play.js`.

### 📌 Errores en `#pin` (Pinterest)
- **Problema:** El error `Media upload failed on all hosts` ocurre cuando Baileys intenta subir la imagen directamente desde la URL.
- **Solución:** Hemos actualizado el código para que descargue la imagen usando `axios` (como Buffer) antes de enviarla, evitando el bloqueo de WhatsApp.

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
    ├── rpg/              # trabajar, cazar, clase, ranknivel
    ├── perfil/           # reg, perfil, eliminarperfil
    ├── descargas/        # play, pinterest, ytsearch, toimg
    ├── stickers/         # sticker, brat, stickers (búsqueda)
    ├── ia/               # ia, iaaudio, imagen
    ├── subbots/          # code, jadibot, stopbot, bots
    ├── premium/          # canjear
    └── owner/            # fix, gencode, addpremium, setbotname, etc.
```

---

🚀 Instalación en Termux (Android)

1️⃣ Actualizar paquetes e instalar dependencias del sistema

```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts ffmpeg libvips -y
```

2️⃣ Clonar el repositorio

```bash
git clone https://github.com/levi-hub805/Levi-bot-.git
cd Levi-bot-
```

3️⃣ Instalar dependencias de Node

```bash
npm install
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
  prefix: ".",
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

  version: "1.0.2",
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
🎮 RPG trabajar, cazar, clase, reiniciarrpg, ranknivel
💰 Economía daily, work, bal, rankcoins
🧾 Perfil reg, perfil, eliminarperfil
🎨 Multimedia pinterest, play, ytsearch, toimg, gato
🖌️ Stickers s, brat, stickers
🧠 IA ia, iaaudio, imagen
🤖 Subbots/Prem code (Gratis), jadibot <num> (Premium), bots, stopbot
💎 Premium canjear <código>
⚙️ Utilidades menu, ping, prueba, info, fix, reporte, wiki, qr, tts
👑 Owners gencode, addpremium, delpremium, backup

Usa #menu dentro del bot para ver la lista completa actualizada.

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
        <sub>🎃 Colaborador y mantenimiento</sub>
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
