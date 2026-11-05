<div align="center">

# ⚔️ Levi-Bot

### Bot de WhatsApp Multi-Device con Baileys

<img src="https://i.postimg.cc/zvV6H1Yh/IMG-20261104-WA0051.jpg" width="180" alt="Levi-Bot"/>

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/levi-hub805/Levi-bot-)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-7.0.x-blue?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Creado por [Jeferson Fernández](https://github.com/levi-hub805) en colaboración con [Sergio Gómez Gort](https://github.com/SergioOficial)**

</div>

---

## 🚀 Últimas Novedades (Update Masivo)

Hemos estado trabajando duro para llevar a Levi-Bot al siguiente nivel. Estas son las actualizaciones más recientes:

- 🗄️ **Migración a Base de Datos Local (`database.json`)**: Ahora los datos de usuarios, economía y RPG se guardan en un solo archivo de forma segura y con auto-guardado.
- 🎨 **Stickers PRO**: Nuevo sistema para crear stickers avanzados (`#s`), generar stickers estilo *Brat* (`#brat`) y buscar packs (`#stickers`).
- 📌 **Pinterest Mejorado**: Ahora busca y envía **múltiples imágenes** (álbum deslizable) en lugar de una sola.
- 🔍 **YouTube Search**: Nuevo comando `#ytsearch` con vista previa (preview) interactiva.
- 🐛 **Sistema de Reportes**: Comandos `#reporte` y `#sugerencia` para enviar bugs directamente al GitHub.
- ♻️ **Auto-Actualización**: Comando `#fix` para que los Owners actualicen el bot desde GitHub sin apagarlo manualmente.
- 🛡️ **Seguridad**: El archivo `database.json` y las sesiones han sido añadidos al `.gitignore` para proteger los datos privados.

---

## ✨ Características

- 🎮 **Sistema RPG** — `#trabajar`, `#cazar`, `#clase`, `#perfilrpg`
- 💰 **Economía** — `#daily`, `#bal`, `#work`, `#rankcoins`
- 🧾 **Perfiles** — `#reg`, `#perfil`, `#eliminarperfil`
- 🎨 **Multimedia** — `#pinterest`, `#play`, `#toimg`, `#ytsearch`
- 🖌️ **Stickers** — `#s`, `#brat`, `#stickers`
- 🧠 **Inteligencia Artificial** — `#ia`, `#chatgpt`, `#gpt`
- 🤖 **Subbots** — `#jadibot`, `#bots`, `#stopbot`
- ⚙️ **Utilidades** — `#ping`, `#info`, `#menu`, `#fix`

---

## ⚠️ Errores Conocidos y Soluciones

Como el bot depende de servicios de terceros (APIs), a veces podemos experimentar fallos ajenos a nuestro código. Aquí te explicamos los más comunes:

### 🎵 Errores en el comando `#play` (YouTube)
- **El problema:** El comando `play` intenta descargar el audio usando librerías externas. YouTube cambia constantemente sus algoritmos de seguridad, lo que puede provocar errores como `Timed Out`, `fetch failed` o que el audio no se envíe.
- **Solución:** Si el comando falla, intenta con otra canción. Si el error persiste por días, será necesario actualizar la librería en `package.json` o cambiar el método de descarga en el código.

### 📌 Errores en el comando `#pin` (Pinterest)
- **El problema:** Antes usábamos APIs como `api.delirius.store`, las cuales cerraron sus servidores (Error `ENOTFOUND`). 
- **Solución:** Hemos actualizado el código para usar `pinscrapper.vercel.app` y `api.siputzx.my.id`. Sin embargo, si Pinterest bloquea las IPs de estos servicios, el bot mostrará un mensaje de "No se encontraron resultados". Si esto pasa, habrá que buscar una nueva API.

### 🤖 Errores al usar `#code` en grupos (LIDs)
- **El problema:** WhatsApp ahora oculta los números de teléfono en los grupos por privacidad (usando LIDs). Si usas `#code` en un grupo, el bot podría intentar crear un subbot con un número inválido y fallar con `Error 408`.
- **Solución:** Para crear un subbot, usa el comando desde el **privado del bot** o usa el comando `.jadibot <tu número con código de país>`.

---

## 🚀 Instalación en Termux (Android)

### 1️⃣ Actualizar paquetes

```bash
pkg update && pkg upgrade -y
```

2️⃣ Instalar git, Node.js y FFmpeg (necesario para stickers)

```bash
pkg install git nodejs-lts ffmpeg -y
```

3️⃣ Clonar el repositorio

```bash
git clone https://github.com/levi-hub805/Levi-bot-.git
```

4️⃣ Entrar a la carpeta

```bash
cd Levi-bot-
```

5️⃣ Instalar dependencias

```bash
npm install
```

⚠️ Nota sobre sharp en Termux: Si tienes problemas con sharp (por la arquitectura de Android), ejecuta:

```bash
npm install @img/sharp-wasm32 --force
npm install sharp --force
```

6️⃣ Iniciar el bot

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

⚙️ Configuración

Edita config.js para personalizar los datos del bot:

```javascript
export const config = {
  prefix: "#",
  botName: "Levi-Bot ⚔️",
  owners: [
    { name: "Jeferson Fernández 💫", number: "573005255807" },
    { name: "Sergio Gómez Gort 🎃",  number: "5358090650" }
  ],
  version: "1.0.0",
  footer: "⚔️ Levi-Bot by Jeferson Fernández from Sergio Gómez Gort"
};
```

---

📁 Estructura del proyecto

```
Levi-bot-/
├── index.js              # Archivo principal (comandos)
├── database.js           # Conexión y guardado de datos
├── database.json         # Base de datos local (NO SUBIR)
├── config.js             # Configuración global
├── package.json          # Dependencias
├── Sessions/             # Sesiones de subbots (NO SUBIR)
└── session/              # Sesión principal (NO SUBIR)
```

---

🧩 Comandos Principales

Categoría Comandos
🎮 RPG trabajar, cazar, clase, reiniciarrpg, perfilrpg
💰 Economía daily, work, bal, rankcoins, ranknivel
🧾 Perfil reg, perfil, eliminarperfil
🎨 Multimedia pinterest, play, ytsearch, toimg
🖌️ Stickers s, brat, stickers
🧠 IA ia, chatgpt, gpt
🤖 Subbots jadibot, bots, stopbot, addowner, delowner
⚙️ Utilidades menu, ping, prueba, info, fix, reporte

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
