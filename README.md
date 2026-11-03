
<div align="center">

# ⚔️ Levi-Bot

### Bot de WhatsApp Multi-Device con Baileys
 <img src= "https://i.postimg.cc/v80bPmY0/IMG-20261101-WA0014.jpg" width="300" alt="Levi-Bot"/>

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/levi-hub805/Levi-bot-)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-6.7.x-blue?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Creado por [Jeferson Fernández](https://github.com/levi-hub805) en colaboración con [Sergio Gómez Gort](https://github.com/SergioOficial)**

</div>

--<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">

<br>

## 💬 Información 

<div align="center">

<p>Únete a nuestra comunidad para recibir ayuda, reportar bugs y estar al día con las actualizaciones.</p>

<br>

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d">
        <img src="https://i.postimg.cc/Kv9GNNGj/IMG-20261103-WA0027.jpg" width="240" alt="Canal de WhatsApp" /><br><br>
        <img src="https://https://img.shields.io/badge/📢_Canal-Oficial-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Canal" />
      </a>
      <br><br>
      <sub><b>Novedades, anuncios y actualizaciones del bot</b></sub>
    </td>
    <td align="center" width="50%">
      <a href="https://chat.whatsapp.com/FAWaPaXIcbpLxpcq823WiE">
        <img src="assets/levi-grupo.jpg" width="240" alt="Grupo de WhatsApp" /><br><br>
        <img src="https://img.shields.io/badge/💬_Grupo-Soporte-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Grupo" />
      </a>
      <br><br>
      <sub><b>Ayuda directa, dudas y comunidad</b></sub>
    </td>
  </tr>
</table>

<br>

<p>
  <sub>⚠️ <b>Importante:</b> el bot es <b>gratuito y open source</b>. Nadie del equipo te pedirá dinero por usarlo, configurarlo o resolver dudas.</sub>
</p>

</div>

<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">-


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">

---

## ✨ Características

- 🎮 **Sistema RPG** — `#trabajar`, `#cazar`, `#clase`, `#perfilrpg`
- 💰 **Economía** — `#daily`, `#bal`, `#work`, `#rankcoins`
- 🧾 **Perfiles** — `#reg`, `#perfil`, `#eliminarperfil`
- 🎨 **Multimedia** — `#pinterest`, `#play`, `#toimg`
- 🧠 **Inteligencia Artificial** — `#ia`, `#chatgpt`, `#gpt`
- ⚙️ **Utilidades** — `#ping`, `#info`, `#menu`
- 🖼️ **Sticker → Imagen** con `sharp`
- 🎵 **Descarga de audio** desde YouTube

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
## 🚀 Instalación en Termux (Android)

### 1️⃣ Actualizar paquetes

```

pkg update && pkg upgrade -y

```

### 2️⃣ Instalar git

```

pkg install git

```

### 3️⃣ Instalar Node.js LTS

```

pkg install nodejs-lts -y

```

> 💡 Si `nodejs-lts` falla, usa:
```

pkg install nodejs -y

```

4️⃣ Clonar el repositorio

```
git clone https://github.com/levi-hub805/Levi-bot-.git
```

5️⃣ Entrar a la carpeta

```
cd Levi-bot-
```

6️⃣ Instalar dependencias

```
npm install
```

7️⃣ Iniciar el bot

```
npm start
```

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
💻 Instalación en PC / VPS / Linux

1️⃣ Clonar el repositorio

```
git clone https://github.com/levi-hub805/Levi-bot-.git
```

2️⃣ Entrar a la carpeta

```
cd Levi-bot-
```

3️⃣ Instalar dependencias

```
npm install
```

4️⃣ Iniciar el bot

```
npm start
```

Al arrancar por primera vez te pedirá tu número de WhatsApp y generará un código de vinculación de 8 dígitos.

```
📱 Ingresa tu número de WhatsApp: 5354386852
🔐 Tu código de vinculación es: A1B2C3D4
```

En WhatsApp ve a Dispositivos vinculados → Vincular con número de teléfono e ingresa el código sin guiones ni espacios.

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
📦 Dependencias individuales

Si npm install falla o quieres instalar las dependencias una por una, ejecuta cada comando por separado:

Baileys (conexión con WhatsApp)

```
npm install @whiskeysockets/baileys
```

Boom (manejo de errores)

```
npm install @hapi/boom
```

Pino (logger silencioso)

```
npm install pino
```

Chalk (colores en consola)

```
npm install chalk
```

Cfonts (banner de inicio)

```
npm install cfonts
```

Node-fetch (peticiones HTTP)

```
npm install node-fetch
```

Sharp (conversión de stickers)

```
npm install sharp
```

Qrcode-terminal (QR alternativo)

```
npm install qrcode-terminal
```

⚠️ En Termux, sharp puede fallar por falta de binarios para Android/ARM64. En ese caso instala la versión WebAssembly:

```
npm install @img/sharp-wasm32 --force
```

```
npm install sharp --force
```

En BotKeep, VPS o cualquier Linux x64 funciona sin ajustes extra.

📋 Lista de dependencias

Paquete Uso
@whiskeysockets/baileys Conexión con WhatsApp
@hapi/boom Manejo de errores de Baileys
pino Logger silencioso
chalk Colores en la consola
cfonts Banner de inicio
node-fetch Peticiones HTTP (IA, Pinterest, YouTube)
sharp Conversión de sticker a imagen
qrcode-terminal QR alternativo si falla el parincode

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
⚙️ Configuración

Edita config.js:

```javascript
export const config = {
  prefix: "#",
  botName: "Levi-Bot ⚔️",
  owners: [
    { name: "Jeferson Fernández 💫", number: "573005255807" },
    { name: "Sergio Gómez Gort 🎃",  number: "5358090650" }
  ],
  ownerName: "Jeferson Fernández 💫 & Sergio Gómez Gort 🎃",
  ownerNumber: "573005255807",
  version: "1.0.0",
  footer: "⚔️ Levi-Bot by Jeferson Fernández from Sergio Gómez Gort",
  apis: {
    vihangayt: "lSq1epGYexsn4WmS"
  }
};
```

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
📁 Estructura del proyecto

```
Levi-bot-/
├── index.js              # Archivo principal (todos los comandos)
├── config.js             # Configuración global
├── package.json          # Dependencias y scripts
├── Archivos/             # Base de datos (auto-creado)
│   ├── rpg.json
│   └── perfiani.json
└── session/              # Sesión WhatsApp (auto-creado, NO subir)
```

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
🧩 Comandos disponibles

Categoría Comandos
🎮 RPG trabajar, cazar, clase, reiniciarrpg, perfilrpg
💰 Economía daily, work, bal, rankcoins
🧾 Perfil reg, perfil, eliminarperfil
🎨 Multimedia pinterest, pin, play, toimg
🧠 IA ia, chatgpt, gpt
⚙️ Utilidades menu, ping, info

Usa #menu dentro del bot para ver la lista completa actualizada.

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
☁️ Despliegue en la nube

BotKeep

1. Canjea el código promocional en Plans & billing
2. Crea un nuevo servicio → Node.js → GitHub
3. Selecciona el repo levi-hub805/Levi-bot-
4. Añade la variable de entorno:
   · WHATSAPP_NUMBER = tu número con código de país (sin +, sin espacios)
5. Deploy y revisa los logs para copiar el código de vinculación

Railway / Render / Fly.io

Mismo proceso: conecta el repo, define WHATSAPP_NUMBER como variable de entorno, y asegúrate de que el comando de inicio sea:

```
npm start
```

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
⚠️ Notas importantes

· 🔐 El código de vinculación se introduce en WhatsApp sin guiones: A1B2C3D4, no A1B2-C3D4.
· ⏱️ El código expira en ~60 segundos; si tarda más, reinicia el bot.
· 🔄 Si el bot no conecta, borra la carpeta session/ y reintenta.

🧹 Limpiar sesión y reiniciar

```
rm -rf session
```

```
npm start
```

---


<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
🆘 Problemas comunes

Problema Solución
sharp no carga en Termux npm install @img/sharp-wasm32 --force
El código de vinculación falla Borra session/, revisa que el número no tenga + ni espacios
"Sesión cerrada" rm -rf session && npm start
"Connection Closed" al pedir el parincode Espera a connecting, no pidas el código inmediatamente tras crear el socket
El bot no responde Verifica que el prefijo en config.js coincida con el que usas en WhatsApp
Cannot find module 'pino' Ejecuta npm install dentro de la carpeta del bot
SyntaxError en config.js Asegúrate de no tener propiedades duplicadas ni comas faltantes

🔧 Comandos útiles de diagnóstico

Verificar versión de Node:

```
node -v
```

Verificar versión de npm:

```
npm -v
```

Verificar dependencias instaladas:

```
npm ls --depth=0
```

Verificar sintaxis de config.js:

```
node --check config.js
```

Ver logs detallados del bot:

```
npm start 2>&1 | tee bot.log
```

---

## 👤 Soportes
<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">

<br>

## 💬 Soporte

<div align="center">

<p>¿Tienes dudas, problemas o sugerencias? Contacta directamente con el equipo.</p>

<table>
  <tr>
    <th>Rol</th>
    <th>País</th>
    <th>Número</th>
    <th>Contactar</th>
  </tr>
  <tr>
    <td>👑 <b>Creador</b></td>
    <td>🇨🇴 Colombia</td>
    <td><code>+57 300 5255807</code></td>
    <td><a href="https://wa.me/573005255807"><img src="https://img.shields.io/badge/WhatsApp-Escribir-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" /></a></td>
  </tr>
  <tr>
    <td>🤝 <b>Colaborador</b></td>
    <td>🇨🇺 Cuba</td>
    <td><code>+53 58090650</code></td>
    <td><a href="https://wa.me/5358090650"><img src="https://img.shields.io/badge/WhatsApp-Escribir-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" /></a></td>
  </tr>
</table>

<br>

<p>
  <sub>⚠️ <b>Importante:</b> el bot es <b>gratuito y open source</b>. Nadie del equipo te pedirá dinero por usarlo, configurarlo o resolver dudas. Si alguien lo hace en su nombre, es un fraude.</sub>
</p>

</div>

<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
---
### 🖥️ Hosting

<div align="center">

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/brayanflores29925-ctrl">
        <img src="https://github.com/brayanflores29925-ctrl.png" width="120" alt="Brayan Flores" style="border-radius:50%" /><br><br>
        <b>Brayan Flores</b>
      </a>
      <br>
      <sub>🖥️ <b>Hosting & Infraestructura</b></sub>
      <br><br>
      <a href="https://github.com/brayanflores29925-ctrl">
        <img src="https://img.shields.io/badge/GitHub-Perfil-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
      </a>
    </td>
    <td align="center" width="50%">
      <br>
      <p>Gracias a <b>Brayan Flores</b> por proporcionar el <b>hosting y la infraestructura</b> que mantienen <b>Nekotoryu-MD</b> en línea 24/7.</p>
      <p><sub>Sin su apoyo, este proyecto no podría estar disponible de forma estable y gratuita para toda la comunidad.</sub></p>
    </td>
  </tr>
</table>

</div>

<br>
---
🤝 Créditos

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/levi-hub805">
        <img src="https://github.com/levi-hub805.png" width="100" alt="Jeferson"/><br/>
        <b>Jeferson Fernández</b><br/>
        <sub>💫 Creador y desarrollador</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/SergioOficial">
        <img src="https://github.com/SergioOficial.png" width="100" alt="Sergio"/><br/>
        <b>Sergio Gómez Gort</b><br/>
        <sub>🎃 Colaborador y mantenimiento</sub>
      </a>
    </td>
  </tr>
</table>

<div align="center">

📚 Librería base: @whiskeysockets/baileys

---

⭐ Si te gusta el proyecto, dale una estrella ⭐

Hecho con 💫 desde Cuba/Colombia para el mundo

https://img.shields.io/badge/Contacto-WhatsApp-25D366?style=flat&logo=whatsapp&logoColor=white
https://img.shields.io/badge/Repositorio-Levi--bot--181717?style=flat&logo=github&logoColor=white

<img src="https://whatsapp.com/channel/0029VbC2PSD60eBcVn60SK1v/637" width="200" alt="Levi-Bot"/>
</div>
