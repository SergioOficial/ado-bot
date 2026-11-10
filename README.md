<div align="center">

# ⚔️ Levi-Bot

### El Bot de WhatsApp Multi-Device Definitivo

<img src="https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg" width="200" alt="Levi-Bot"/>

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/levi-hub805/Levi-bot-)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-7.0.x-blue?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Creado por [Jeferson Fernández](https://github.com/levi-hub805) en colaboración con [Sergio Gómez Gort](https://github.com/SergioOficial)**

[Características](#-características-principales) • [Instalación](#-instalación-y-despliegue) • [Estructura](#-arquitectura-modular) • [Comandos](#-comandos-principales)

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
├── index.js              # Núcleo (Conexión Baileys, Multi-Prefijo y Cargador)
├── pluginLoader.js       # Escáner dinámico de comandos y eventos
├── database.js           # Gestor de base de datos local auto-guardable
├── database.json         # Datos de usuarios y grupos (NO SUBIR A GITHUB)
├── config.js             # Configuración (Prefijos, Owners, etc.)
├── .env                  # Variables de entorno (NO SUBIR A GITHUB)
└── plugins/              # ¡El corazón del bot!
    ├── admin/            # close, open, del, tag, welcome, goodbye
    ├── descargas/        # play, pinterest, tiktok, gitclone
    ├── economia/         # daily, work, bal, dep, slots, cf
    ├── events/           # Eventos pasivos (ej. welcome.js)
    ├── fun/              # meme, gato, trivia, 8mate
    ├── ia/               # ia, iaaudio, imagen
    ├── info/             # menu, ping, info, creadores
    ├── owner/            # fix, restart, exec, error, backup
    ├── perfil/           # reg, perfil, nivel
    ├── rpg/              # cazar, pescar, minar, explorar
    ├── stickers/         # sticker, brat
    ├── subbots/          # code, jadibot, stopbot
    └── utils/            # qr, tts, wiki, traducir, clima
```

---

🛠️ Instalación y Despliegue

📱 En Termux (Android)

```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts ffmpeg libvips -y
```
```
git clone https://github.com/SergioOficial/Levi-bot.git
cd Levi-bot
```
```
npm install
npm install  @whiskeysockets/baileys
```

# Si sharp falla en Termux (Android ARM64):
```bash
npm install @img/sharp-wasm32 --force
npm install sharp --force
```
```
npm start
```

💻 En Hosting (BotKeep / VPS)

1. Sube el repositorio a tu hosting (ej. BotKeep).
2. En el panel de control, configura las siguientes Variables de Entorno:
   · WHATSAPP_NUMBER: Tu número de teléfono (ej. 5354386852).
   · GITHUB_TOKEN: (Opcional) Token de GitHub para los comandos de reportes e invitaciones.
3. Establece el comando de inicio (npm start o node index.js).

---

⚙️ Configuración (config.js)

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

---

🧩 Comandos Principales

Categoría Comandos Destacados
🎮 RPG trabajar, cazar, pescar, minar, explorar, clase, ranknivel
💰 Economía daily, work, bal, dep, with, pay, slots, cf, crime
🧾 Perfil reg, perfil, nivel, delperfil
🎨 Descargas play, pin (Pinterest), tt (TikTok), fb, ytsearch, gitclone
🖌️ Stickers s / sticker, brat, stickers
🧠 IA ia, iaaudio, imagen, chatgpt
🎉 Juegos trivia, mate, 8ball, meme, ship
🛡️ Admin close, open, del, tag, welcome, goodbye
👑 Owner fix, restart, exec, error, invite, gencode

💡 Tip: Recuerda que puedes usar cualquier comando en modo privado añadiendo un - al final (Ej: .menu-).

---

🤝 Créditos y Contacto

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

📚 Librería base: @whiskeysockets/baileys

---

⭐ Si te gusta el proyecto, dale una estrella ⭐

Hecho con 💫 desde Cuba para el mundo

https://img.shields.io/badge/Repositorio-Oficial-181717?style=flat&logo=github&logoColor=white

</div>

