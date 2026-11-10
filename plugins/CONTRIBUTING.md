
# 🛠️ Guía para Desarrolladores - Levi-Bot

¡Bienvenido al equipo de desarrollo de **Levi-Bot**! Este bot está construido con **Node.js** y **Baileys**, y utiliza una **arquitectura 100% modular basada en plugins**. Esto significa que no necesitas tocar el archivo `index.js` para añadir un nuevo comando.

---

## 📂 Estructura de los Plugins

Todos los comandos viven dentro de la carpeta `plugins/`. Para mantener el orden, están organizados por categorías:

```text
plugins/
├── admin/       # Comandos de administración de grupos (close, open, welcome, tag)
├── descargas/   # Descargas y multimedia (play, pinterest, tiktok, github)
├── economia/    # Sistema de dinero y juegos (work, daily, slots, dep)
├── fun/         # Comandos de diversión (meme, gato, trivia, 8ball)
├── ia/          # Inteligencia Artificial (ia, imagen, iaaudio)
├── info/        # Información del bot (menu, ping, info)
├── owner/       # Comandos exclusivos del dueño (fix, backup, error)
├── perfil/      # Sistema de usuarios (reg, perfil, nivel)
├── rpg/         # Aventura y experiencia (cazar, pescar, minar)
├── stickers/    # Creación de stickers (s, brat)
├── subbots/     # Sistema de sub-bots (code, jadibot)
└── utils/       # Utilidades (traducir, clima, qr, tts)
```

Para crear un nuevo comando, simplemente crea un archivo .js dentro de la carpeta de su categoría correspondiente. El sistema (pluginLoader.js) lo detectará y cargará automáticamente.

---

🧩 Estructura de un Plugin

Todos los plugins deben exportar un objeto por defecto (export default) con la siguiente estructura:

```javascript
export default {
  // 1. Nombres del comando (array). Puedes poner varios alias.
  command: ["ejemplo", "ej"],
  
  // 2. (Opcional) Si es true, solo los dueños pueden usarlo.
  isOwner: false,

  // 3. La función que se ejecuta.
  execute: async (ctx) => {
    // Tu código aquí
  }
};
```

---

📦 El Objeto ctx (Contexto)

El bot inyecta un objeto llamado ctx a cada comando. Este objeto contiene todo lo que necesitas para que tu comando funcione. No necesitas importar Baileys ni la base de datos, ya vienen incluidos en ctx.

Propiedad Descripción
sock El socket de Baileys. Úsalo para sock.sendMessage, sock.groupMetadata, etc.
m El mensaje original (objeto crudo de Baileys).
from El JID del chat donde se ejecutó el comando (grupo o privado).
sender El JID de la persona que envió el comando.
isGroup true si el comando se usó en un grupo, false si es privado.
args Un array con las palabras que el usuario escribió después del comando.
comando El nombre exacto del comando que se ejecutó.
texto Todo el texto que el usuario escribió después del prefijo.
enviartexto Función auxiliar: enviartexto("Hola"). Maneja el envío y el modo privado.
PREFIX El prefijo que usó el usuario (ej. ., #, /).
BOT_NAME El nombre del bot desde config.js.
config El objeto de configuración completo (prefijo, owners, etc).
db La base de datos (global.db.data). Aquí guardas usuarios, grupos, etc.
isOwnerCheck(sender, sock) Función que devuelve true si el usuario es Owner.
jidToNumber(jid) Convierte 57300...@s.whatsapp.net a 57300....
getTargetFromMsg(m, args) Extrae el JID de un usuario mencionado o respondido.

---

💾 Uso de la Base de Datos (ctx.db)

La base de datos se guarda automáticamente en database.json. Está dividida en tres partes principales:

1. Usuarios (ctx.db.users)

Para guardar datos de un usuario, usa su JID como clave.

```javascript
// Obtener o crear usuario
if (!ctx.db.users[ctx.sender]) ctx.db.users[ctx.sender] = { coins: 0 };
const user = ctx.db.users[ctx.sender];

// Modificar datos
user.coins += 100;
user.nivel = 5;

// No necesitas guardar manualmente, el bot lo hace solo.
```

2. Grupos / Chats (ctx.db.chats)

Para guardar configuraciones de un grupo específico (usando el JID del grupo).

```javascript
if (!ctx.db.chats[ctx.from]) ctx.db.chats[ctx.from] = {};
const chat = ctx.db.chats[ctx.from];

chat.welcome = true;
chat.antiLink = false;
```

---

📝 Ejemplo Práctico: Comando "Hola"

Así se vería un comando simple que responde "Hola" y te da 10 coins.

Crea el archivo plugins/utils/hola.js:

```javascript
export default {
  command: ["hola", "hello"],
  isOwner: false,
  execute: async (ctx) => {
    const { sender, enviartexto, db, PREFIX, BOT_NAME } = ctx;

    // 1. Asegurar que el usuario existe en la DB
    if (!db.users[sender]) db.users[sender] = { coins: 0 };
    const user = db.users[sender];

    // 2. Modificar sus datos
    user.coins = (user.coins || 0) + 10;

    // 3. Crear el mensaje usando el prefijo dinámico (PREFIX)
    const mensaje = `
👋 *¡Hola!* Bienvenido a ${BOT_NAME}.
Te he regalado *10 coins* por saludar.
Ahora tienes: *${user.coins}* coins.

> Usa *${PREFIX}bal* para ver tu balance.
    `.trim();

    // 4. Enviar respuesta
    await enviartexto(mensaje);
  }
};
```

---

⚠️ Reglas de Oro para Desarrolladores

1. Usa ctx.PREFIX en lugar de hardcodear el prefijo: El bot soporta múltiples prefijos (., #, /). Si en tu mensaje necesitas mostrar un comando (ej. Usa .menu), siempre usa ${ctx.PREFIX}menu para que se adapte al prefijo que usó el usuario.
2. Usa siempre try...catch: Si tu comando falla, no debe tumbar el bot entero. Envuelve tu lógica en un bloque try/catch.
3. Usa ctx.enviartexto: En lugar de sock.sendMessage, usa ctx.enviartexto para respuestas simples. Esto asegura que el comando funcione correctamente si el usuario lo usó en modo privado (añadiendo un - al final del comando).
4. Evita las descargas infinitas: Si haces peticiones a APIs externas, usa siempre timeout (ej. axios.get(url, { timeout: 15000 })) para evitar que el bot se quede colgado.
5. Comprime imágenes: Si vas a descargar y enviar imágenes, usa siempre sharp para redimensionar a 800px y convertirlas a JPEG. Esto evita el error Media upload failed de WhatsApp.

¡Feliz codificación! 🚀