
> [!IMPORTANT]
> **Este proyecto está en constante evolución. Estamos comprometidos en ofrecer a nuestra comunidad un Bot increíble. Te invitamos a instalarlo y para estar al tanto de todas las novedades. [¡Únete a nuestro nuevo canal!](https://whatsapp.com/channel/0029Vb758GP6rsQkqWy5Xm2j)**

<p align="center" >
<img src="https://i.postimg.cc/432DgtBQ/IMG-20261110-WA0107.jpg" width="190" alt="ado-Bot" style="width: 75%; height: auto; max-width: 100px;">

#  𝙰𝚍𝚘-𝑩𝒐𝒕

<p align="center"> 
<a href="#"><img title="Ado-bot" src="https://img.shields.io/badge/¡Disfruta de un Bot totalmente gratuito, con múltiples funciones y de código abierto! -purple?colorA=%239b33b0&colorB=%231c007b&style=for-the-badge"></a> 
</p>

---

## 🌃 Descripción 
**El bot de WhatsApp multi-dispositivo, modular y sin cajas negras.**

Se conecta con Baileys, arranca con un código de vinculación y cada comando es
un archivo que puedes leer, cambiar o borrar.

[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/SergioOficial/ado-bot)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-%40itsliaaa%2Fbaileys-blue?style=for-the-badge)](https://www.npmjs.com/package/@itsliaaa/baileys)
[![Comandos](https://img.shields.io/badge/Comandos-475-informational?style=for-the-badge)](#-comandos)
[![Licencia](https://img.shields.io/badge/Licencia-AGPL--3.0-blue?style=for-the-badge)](LICENSE)

**Creado por [Sergio Gómez Gort](https://github.com/SergioOficial) y [riokuroxi-svg](https://github.com/riokuroxi-svg)**

[Qué es](#-qué-es-ado-bot) • [Instalación](#-instalación) • [Estructura](#️-estructura-del-proyecto) • [Comandos](#-comandos) • [Licencia](#-licencia) • [Créditos](#-créditos)

</div>

---

<details>
<summary><strong>Que es Ado-bot</strong> — Te explico</summary>

| Lo que trae | Para qué sirve |
|---|---|
| 🧩 **Todo es un plugin** 
| Cada comando es un archivo en `plugins/`. Se carga solo, sin tocar `index.js`. Si borras el archivo, el comando desaparece del menú. |
| 🔀 **Multi-prefijo**
| Responde a `.`, `#`, `/` y 🇨🇺 a la vez. Se cambia en `config.js`. |
| 🕵️ **Modo privado** 
| `.menu-` con un guion al final: borra tu mensaje del grupo y te contesta por privado. |
| 🔘 **Botones nativos** 
| Respuesta rápida, copiar, enlace, llamar, ubicación, mini web y **listas desplegables**, con los nodos binarios que WhatsApp exige y respaldo en texto si el móvil no los pinta. Se apagan con `BOTONES=off` sin tocar código. |
| 📅 **Versión de WhatsApp al día** 
| La revisión se pregunta a WhatsApp (`web.whatsapp.com`), no al repositorio del cliente. Eso es lo que evita el cierre «actualiza WhatsApp». |
| 💎 **Premium y sub-bots** 
| Clones del bot vinculando otros números, con sus propios owners. |
| 🎨 **Multimedia sin romperse** 
| Descargas de Pinterest, TikTok, Facebook y YouTube con compresión (`sharp`) para que no falle la subida. |
| 🧠 **IA, economía y RPG** 
| Texto, imágenes y notas de voz; monedas con banco y caja fuerte; niveles, caza, pesca y minería. |
| ⚔️ **Peleas de mascotas** 
| Combates por turnos contra una salvaje o contra otro entrenador, **con botones**: elegir ataque, cambiar de mascota, capturar o huir. Ocho tipos con tabla de eficacia. |
| 🎴 **Gacha de personajes** 
| `.rw` tira un personaje con su imagen, `.claim` lo reclama y `harem`, `wtop` y `charinfo` llevan la colección del grupo. Se enciende y apaga por grupo. |
| 🛡️ **Freno de envíos** 
| Cola única, espera variable, calentamiento diario y vigilante de riesgo. Sin prometer que la cuenta no sea bloqueada. |
| ✅ **Se puede comprobar** 
| Cuatro scripts dicen si el bot está bien **sin abrir WhatsApp**. |
</details>

<details>
<summary><strong>🩸 Instalaciones</strong> — Paso a paso</summary>

Requisitos en todos los casos: **Node.js 20 o superior**, `git` y conexión a
internet. Nada más.

1. Instala Termux **desde F-Droid o GitHub**, no desde Play Store (esa versión
   está abandonada y no actualiza paquetes).

   ```https://f-droid.org/es/packages/com.termux/
   ```
----

2. Abre Termux y actualiza los paquetes base:
   ```pkg update && pkg upgrade -y
   ```
---

3. Instala lo necesario. python, make y clang no son adorno: un paquete
   del cliente es nativo y en ARM se compila.

   ```bash
   pkg install git nodejs-lts python make clang ffmpeg libvips -y
   ```
---

4. Evita que Android duerma el bot cuando apagues la pantalla:
   ```bash
   termux-wake-lock
   ```

---

5. Descarga el bot y entra en la carpeta:
   ```bash
   git clone https://github.com/SergioOficial/ado-bot.git
   cd ado-bot
   ```
---

6. Instala las dependencias. En un móvil esto tarda entre 10 y 25 minutos y
   parece colgado: está compilando. No cierres Termux.
   ```bash
   npm install
   ```
---

7. Comprueba que todo está en su sitio (no abre WhatsApp todavía):
   ```bash
   npm run verificar
   ```
---

8. Arranca:
   ```bash
   npm start
   ```
---

9. Escribe tu número con código de país cuando lo pida, sin + ni espacios
   (ejemplo: 5215512345678), y usa el código de 8 caracteres que aparece en
   WhatsApp → Dispositivos vinculados → Vincular con número de teléfono.
10. Para que siga vivo al cerrar Termux, déjalo en segundo plano:
    ```bash
    nohup npm run vigia > bot.log 2>&1 &
    tail -f bot.log
    ```
    vigia (en vez de start) es lo que hace que el bot se levante solo si se
    cae o si reinicias desde WhatsApp con .restart.
</details>

<details>
<summary>🖥️ Servidor VPS (Ubuntu / Debian)<strong></strong> — paso a paso </summary>

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
   git clone https://github.com/SergioOficial/ado-bot.git
   cd ado-bot
   ```
4. Crea el archivo .env con tu número, para que no lo pregunte por consola:
   ```bash
   echo "WHATSAPP_NUMBER=5215512345678" > .env
   ```
5. Instala y comprueba:
   ```bash
   npm install
   npm run verificar
   ```
6. Arranca con un vigilante que lo levanta si se cae (pm2):
   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name ado-bot
   pm2 logs ado-bot        # aquí sale el código de vinculación
   pm2 save && pm2 startup  # que arranque solo si reinicias el servidor
   ```
   Sin pm2, usa npm run vigia dentro de tmux o screen: arranca el bot
   y lo vuelve a levantar si se cae, sin instalar nada más.
</details>
<details>
<summary><strong>☁️ Hosting con panel</strong> — (BotKeep, Railway, Pterodactyl…)</summary>
1. Sube el repositorio a tu cuenta (o haz un fork) y conéctalo al panel.
2. Pon el proyecto en Node 20.
3. En Variables de entorno añade:
   · WHATSAPP_NUMBER — tu número con código de país.
   · GITHUB_TOKEN — opcional, solo para .reporte e .invite.
   · BOTONES=off — opcional, manda los menús como texto sin botones.
   · BOTONES_FORMATO=moderno|plantilla|clasico — opcional, cómo se mandan las
     tarjetas: moderno (por defecto, el más bonito), plantilla (mismo
     menú dentro de un mensaje de plantilla: lo entienden los WhatsApp viejos) o
     clasico (buttonsMessage, lo pinta cualquiera; si un botón es lista o
     enlace, se cae al moderno).
   · BOTONES_VIEWONCE=1 — opcional, vuelve al envoltorio viejo de los interactivos.
4. Comando de inicio: npm start (o node index.js).
5. Mira los logs del panel para copiar el código de vinculación.
</details>

<details>
<summary><strong>🗣️ Actualizar El Bot </strong> — Simple</summary>
Desde WhatsApp, con el bot encendido: .fix (solo dueños). Si hay cambios
locales sin subir, avisa y no toca nada hasta que lo confirmes otra vez; el
parche queda guardado en tmp/.

A mano:

```bash
git pull
npm install          # solo si cambió package.json
npm start
```
</details>

---

⚠️ Antes de usar una cuenta

Usa un número secundario, no el tuyo personal. Ningún bot puede garantizar que
una cuenta no sea bloqueada; este lleva freno de ritmo, calentamiento y
vigilancia (míralo con .warmup), que baja el riesgo pero no lo elimina.

<details>
<summary><strong>🧪 Comprobar que está bien</strong> — (sin abrir WhatsApp)
</summary>
Comando Qué hace
npm run verificar Cliente, botones, versión de WhatsApp, sintaxis, carga real de los 124 plugins y owners.
npm run probar 233 pruebas: compuerta de mensajes, router, anti-eco, sub-bots, recordatorios, encuestas, morse, red segura, economía, fechas y actividad.
npm run humo Llama a los 116 plugins con un contexto falso y señala los que revientan (los que borran archivos o reinician no se ejecutan nunca).
npm run auditar Qué comandos dependen de una API externa y qué archivo no existe. Informe en docs/COMANDOS.md.
npm run sintaxis node --check en los 219 archivos del árbol, incluidos los plugins que solo se cargan al usarse.
npm run imports Que todo import apunte a un archivo que existe, a un nombre que de verdad se exporta y a un paquete declarado en package.json.
npm run lint ESLint con las reglas que atrapan bugs: variables que no existen, claves duplicadas, código inalcanzable. Es lo que encuentra lo que node --check y las pruebas no ven.
npm run vigia Arranca el bot con un vigilante que lo levanta si se cae (para Termux, VPS o nohup).

Si algo falla, ahí se ve si el problema es del bot o de la sesión — antes de
culpar al teléfono. ¿Actualizaste y algo se rompió? Punto de retorno:
docs/RETORNO.md.
</details>

---

🏗️ Estructura del proyecto

```text
ado-bot/
├── index.js              # Punto de entrada: una línea que arranca boot/
├── boot/                 # El núcleo, una pieza por archivo
│   ├── arranque.js       #   orden de encendido: conexión, router, sub-bots, vigilantes
│   ├── router.js         #   de messages.upsert a un plugin, con aislamiento de fallos
│   ├── subbots.js        #   ciclo de vida de los sub-bots, con techo de reintentos
│   ├── vigilantes.js     #   recordatorios, memoria y anti-ban, con su apagado
│   └── anti-cuelgue.js   #   que un error suelto o un corte de red no apague Node
├── eslint.config.js      # Reglas que atrapan bugs, no opiniones de estilo
├── pluginLoader.js       # Escáner de comandos y eventos
├── config.js             # Prefijos, owners, nombre del bot, footer
├── lib/                  # Lo compartido, sin duplicar en cada plugin
│   ├── baileys.js        #   cliente único (fork por defecto, con respaldo)
│   ├── wa-version.js     #   versión de WhatsApp Web preguntada a WhatsApp
│   ├── compuerta.js      #   qué mensaje entrante es un comando (puro, probado)
│   ├── bucles.js         #   corte del eco entre cuentas de bot
│   ├── botones.js        #   botones nativos + respaldo en texto
│   ├── wa-nodes.js       #   nodos binarios que exigen los mensajes con botones
│   ├── encuestas.js      #   encuesta, quiz y voto múltiple nativos
│   ├── recordatorios.js  #   avisos que sobreviven al reinicio
│   ├── grupo.js          #   administradores, menciones y objetivos
│   ├── actividad.js      #   contador de quién habla en cada grupo
│   ├── economia.js       #   apuestas, plazos y formato del dinero
│   ├── consultas.js      #   APIs externas con plazo y error claro
│   ├── antiban.js        #   cola de envíos, ritmo, calentamiento y vigilante
│   ├── album.js          #   álbumes nativos (varias fotos en una tarjeta)
│   ├── red-segura.js     #   pedir URLs sin abrir la red interna
│   ├── rutas.js          #   una sola ruta para las carpetas de datos
│   └── database.js       #   base JSON con autoguardado
├── plugins/              # ¡El corazón del bot!
│   ├── admin/            # kick, promote, warn, antilink, setgp, pin, actividad
│   ├── descargas/        # play, pinterest, tiktok, fb, gitclone
│   ├── economia/         # daily, weekly, work, bal, dep, coffer, ruleta, casino
│   ├── fun/              # meme, gato, trivia, 8ball, ship
│   ├── gacha/            # rw, claim, harem, wtop, charinfo
│   ├── ia/               # ia, iaaudio, imagen
│   ├── info/             # menu, allmenu, ping, health, creadores
│   ├── owner/            # fix, restart, backup, exec, block, getplugin
│   ├── perfil/           # reg, perfil, level, lboard, afk, ficha
│   ├── premium/          # canjear
│   ├── rpg/              # pelear, adoptar, cazar, pescar, minar, explorar
│   ├── stickers/         # sticker, brat
│   ├── subbots/          # code, jadibot, stopbot, bots
│   ├── test/             # botones de prueba
│   └── utils/            # qr, morse, encuesta, recordar, say, get, pfp, crypto
├── pruebas/              # Pruebas que corren sin abrir WhatsApp
├── scripts/              # verificar · probar · humo · auditar · sintaxis · imports · vigia
└── docs/                 # CLIENTE · COMANDOS · PORTE · RETORNO
```

---
<details>
<summary><strong>🔩 Ajustes</strong> — (config.js) </summary>

```javascript
export const config = {
  // 🔥 El bot responde a cualquiera de estos prefijos
  prefix: [".", "#", "/"],

  botName: "𝐀𝐝𝐨-𝐁𝐨𝐭 🩸",

  owners: [
    { name: "Sergio Gómez Gort",         number: "5358090650" },
    { name: "Jeferson Fernández",        number: "573005255807" },
    { name: "Roxi",                      number: "5215574370309" }
  ],

  // La versión no se pone aquí: se lee de package.json, que es lo que anuncia
  // GitHub con su etiqueta. Cambiarla en un solo sitio la cambia en .info,
  // .infobot, .estado y .botinfo.
  footer: "𝙰𝚍𝚘-𝑩𝒐𝒕 by Wyra Studios"
};
```
</details>

> Los comandos con isOwner (.restart, .exec, .fix, .backup, .getplugin…)
solo los usan los números de owners. La comparación vale con y sin lada:
5215574370309, 5574370309 y 525574370309 se reconocen como el mismo
número, así que da igual cómo esté escrito en la lista. Si un comando de administrador no
funciona, comprueba que el bot sea admin del grupo: el propio comando lo dice
cuando no puede.

---

<details>
<summary><strong>🧩 Comandos</strong> — Todos dentro de Plugins</summary>

Prefijo de ejemplo .. Casi todos tienen alias en español (#diario, #robar,
#fijar…): la lista completa está en docs/COMANDOS.md y en
el propio WhatsApp con .allmenu y .menucat. Los números cuentan nombres, alias
incluidos.

Categoría Comandos Ejemplos
🛡️ Admin 43 kick promote demote warn warns antilink hidetag bot off link revoke setgpname setgpdesc setgpbanner pin gp count topcount topinactive
🧾 Perfil 24 reg perfil level lboard afk setdesc setgenre sethobby setbirth delperfil
💰 Economía 54 daily weekly monthly work beg bal dep with pay rob cf slots dice ppt roulette casino coffer rankcoins einfo
⚔️ RPG 21 trabajar cazar pescar minar explorar clase ranknivel reiniciarrpg adoptar animal nombrar acariciar pelear atacar cambiar huir capturar petactivo
🎴 Gacha 19 gacha togacha rw roll rollwaifu claim c reclamar harem waifus claims wtop topwaifus waifustop waifusboard charinfo winfo waifuinfo
📥 Descargas 25 play mp3 tt fb pinterest toimg ytsearch gitsearch githubsearch ghsearch
🖌️ Stickers 5 sticker brat searchsticker
🧠 IA 9 ia iaaudio imagen
🎉 Fun 22 trivia mate 8ball meme gato perro waifu ship r
ℹ️ Info 32 menu allmenu menucat ping info creadores health runtime cache lid reporte
🔔 Utilidades 70 ping info menu allmenu health traducir clima wiki tts qr morse demorse encuesta say read recordar pfp wastalk crypto letra acortar tourl tag
🤖 Sub-bots 13 code jadibot stopbot bots addowner delowner
💎 Premium 2 canjear
👑 Owner 61 fix restart reload backup exec eval subir compat getplugin nuevo delplugin block unblock blocklist botsesion setbotname setbotpp clear warmup antiban
🧪 Test 7 botones boton1…boton6

💡 Cualquier comando funciona en modo privado con un guion al final: .menu-.
</details>

---

<details>
<summary><strong>🔑 Explicación de la Versión</strong> — Te explico</summary>

· 🔎 ESLint como puerta (eslint.config.js, npm run lint): reglas que
  atrapan bugs, no opiniones de estilo — no-undef, no-dupe-keys,
  no-unreachable, no-cond-assign, no-var. Las de higiene (prefer-const,
  no-unused-vars, eqeqeq) arrancan en warn para no pintar de rojo un repo
  ya escrito, y se suben a error cuando el conteo llegue a cero. Van 19.
  No es decoración: no-undef es la regla que habría visto el PREFIX sin
  definir antes de que tirara el servidor — corrida sobre el index.js
  anterior al arreglo, lo señala en la línea 450.
· 🐛 Tres bugs que las 229 pruebas no veían, encontrados por el lint y
  cubiertos ahora en pruebas/regresion-lint.test.mjs:
  · lib/antiban.js llamaba a dormir() desde envolverSocket(), pero
  dormir estaba definida dentro de crearCola(). El ReferenceError
  caía en un catch {} con su comentario explicativo, así que no se veía en
  ningún sitio: la espera de ritmo humano antes de cada envío no ocurría
  nunca. Se encendía el «escribiendo…» y el mensaje salía al instante, que
  es justo el patrón que el anti-ban pretende evitar. (Nota: no-empty con
  allowEmptyCatch no lo habría visto; lo vio no-undef.)
  · .say hola contestaba «⚠️ No pude repetir eso. text is not defined»:
  mandaba { text } — forma corta, o sea text: text — donde la variable se
  llama texto.
  · Una prueba de botones afirmaba igual(null ?? "sin viewOnce", "sin viewOnce"):
  una constante contra sí misma. Daba verde pasara lo que pasara con el proto.
  Ahora comprueba vuelta.viewOnceMessage === null de verdad.
· 🧱 El núcleo se partió en piezas (boot/): index.js era un archivo de 620
  líneas donde la conexión, los sub-bots, los vigilantes y el enrutado de
  mensajes compartían variables. Ahora index.js es una línea que arranca
  boot/arranque.js, y cada pieza tiene su archivo — router.js, subbots.js,
  vigilantes.js, anti-cuelgue.js — más lib/compuerta.js (qué mensaje es un
  comando) y lib/bucles.js (el eco entre cuentas). Consecuencia práctica:
  cuando algo falla se abre el archivo de esa pieza. Y cada una se puede probar
  sin abrir WhatsApp, que es lo que permitió medir todo lo de abajo.
· 🚪 El bot ya no se cae con un mensaje raro. Había dos fallos que mataban el
  proceso entero, no un comando:
  · El bloque anti-bucle de index.js estaba a medio escribir — le faltaba la
  llave que lo cerraba, así que el archivo no compilaba y el bot no
  arrancaba (node --check lo decía; el CI estaba en rojo).
  · Comparaba el texto con PREFIX, una variable que en ese ámbito no existe.
  Como el manejador es asíncrono y va enganchado a un evento, ese
  ReferenceError salía como rechazo no manejado y Node apaga el proceso:
  un solo mensaje marcado como propio tiraba el servidor. Ese era el «un bot
  pone un comando y se cae».
  Ahora la decisión vive en lib/compuerta.js, que nunca lanza (20 pruebas con
  basura por entrada), el router aísla cada mensaje en su propio try, y
  boot/anti-cuelgue.js filtra los cortes de red y aguanta los errores sueltos.
  229 pruebas pasan (eran 157).
· 🔁 Eco entre bots cortado (lib/bucles.js): la compuerta descarta lo que
  la cuenta se manda a sí misma (fromMe), que es lo que evita el bucle infinito
  cuando el bot se responde con algo que empieza con prefijo. Lo que quedaba sin
  cubrir era el eco entre dos cuentas distintas — el caso real con .jadibot,
  donde el sub-bot ve el mensaje del principal como ajeno. Se cortan dos
  patrones: el mismo pedido calcado dos veces en menos de 1,2 s, y el mensaje que
  cita una salida propia. Con huella completa (chat + autor + comando + args),
  así que dos personas pidiendo .menu a la vez no se estorban.
· 🔌 Los sub-bots ya no se reconectan solos para siempre: con el código 515
  (restartRequired) el manejador se llamaba a sí mismo sin espera y sin límite,
  o sea que un 515 persistente ponía al bot a crear sockets sin parar — memoria
  arriba y una cuenta haciendo cosas raras a toda velocidad, que es justo lo que
  mira el anti-ban. Ahora hay espera creciente (2 s, 4 s, 8 s… tope 60 s) y techo
  de 5 intentos, con aviso al dueño cuando se rinde. También se cerró la
  reentrada (un cierre podía levantar dos sockets para el mismo número, con los
  dos atendiendo el mismo grupo) y el aviso al sub-bot ya no se pierde cuando el
  principal reconecta y estrena socket.
· 💾 La base se escribe de forma atómica (lib/database.js): se guardaba
  directo sobre database.json. Si el proceso moría a mitad — OOM, kill -9, el
  hosting reciclando el contenedor — el archivo quedaba partido y el bot
  arrancaba con la base vacía: perfiles, economía y mascotas de todos, perdidos.
  Ahora se escribe en un temporal y se renombra (rename es atómico), y si el
  JSON llega roto se aparta una copia .roto-<fecha> en vez de pisarla.
· 🧩 .tourl y .mf funcionaban de rebote: importaban form-data y
  mime-types sin estar declarados en package.json — se resolvían porque otra
  dependencia los trae instalados. Es el mismo fallo que ya tenía .apk con
  aptoide-scraper: en una instalación limpia o al cambiar el árbol, el comando
  muere. Declarados, y .tourl vuelve a importar el cliente desde
  lib/baileys.js en vez de atarse al paquete oficial (el bot corre con el fork).
· 📁 Las rutas de datos salen de un solo sitio: .setprimary, .revivirsubs,
  .clear, .error y .tts escribían ./sub/SubBots y ./tmp a mano mientras
  lib/rutas.js ya las exportaba. Ya se había visto este fallo una vez (.bots
  buscaba en otra carpeta y la lista salía con un solo bot).
· 📢 El crédito del menú apuntaba a un canal que no es el de Shin-MD: se
  corregió al de origen, y la prueba que lo vigilaba tenía la URL mal transcrita,
  así que estaba fallando en cada corrida del CI.
· 🚦 Puerta nueva en el CI (npm run imports): node --check mira cada
  archivo por separado, así que un import a un archivo inexistente, a un nombre
  que el módulo no exporta, o a un paquete sin declarar, pasaba la revisión y
  reventaba al arrancar. Ahora se revisa el árbol entero — comprobado que detecta
  los tres casos.
· 🔔 Aviso de memoria (boot/vigilantes.js): con sub-bots hay un socket por
  cuenta y nada miraba la RAM. Se revisa cada 5 minutos y avisa al pasar 700 MB,
  que es el mismo umbral que .estado ya usa para sugerir .restart.
· ⚔️ Peleas de mascotas con botones (plugins/rpg/pelea.js): .pelear saca
  una salvaje del tamaño de tu mascota y .pelear @alguien reta a otro
  entrenador. En la tarjeta de la pelea van tres botones — la lista de ataques
  (con su poder y su precisión), .cambiar y .huir — y un cuarto, .capturar,
  cuando la salvaje baja del 40 % de vida. Cada tipo (fuego, agua, planta,
  tierra, aire, luz, sombra y normal) tiene tres ataques y su tabla de eficacia,
  así que la misma pelea no sale igual dos veces. El turno se respeta: solo
  ataca a quien le toca, cambiar gasta el turno y una pelea parada 20 minutos se
  cierra sola. La id de cada botón es el comando escrito (atacar 2), o sea que
  con los botones apagados (BOTONES=off) el respaldo en texto sigue sirviendo.
· 🎴 Gacha reescrito y medido (plugins/gacha/ + lib/gacha.js): seis
  comandos en su archivo, como el resto de categorías — rw, claim, harem,
  wtop, charinfo y el interruptor gacha on|off (solo administradores).
  Tres cosas que se arreglaron midiendo, no adivinando:
  · Danbooru contestaba 403 a todo porque se le hablaba con el User-Agent de
  un navegador; el respaldo estaba muerto y no se notaba porque Safebooru
  tapaba el hueco casi siempre.
  · Se manda la muestra (850 px), no el original: había originales de 3000 px
  que no terminaban de bajar en 10 s, y de ahí salían los .rw de 16-18 s.
  · Las tres candidatas se bajan en paralelo y la primera que llega gana.
  Resultado de 20 tiradas seguidas: 0 fallos, promedio 0,9 s, máximo 1,7 s
  (antes: promedio 5,2 s y picos de 17,6 s). Con GACHA_DEBUG=1 el bot escribe
  en consola en qué se fue el tiempo de cada tirada.
· 🎴 Gacha en el menú: .rw, .claim, .harem, .wtop, .charinfo y su
  gacha on|off ya salen en el menú principal y en .menu gacha, y la carpeta
  plugins/gacha/ aparece en .allmenu como una categoría más.
· 🔖 Menú con guía rápida: la leyenda de símbolos del menú de Shin-MD
  (Ⓓ Dueño · Ⓟ Premium · Ⓐ Admin · Ⓖ Grupos · Ⓛ Límite) y su crédito, con el
  texto tal cual lo escribió su autor. Las marcas no van a mano: se leen de
  los plugins cargados, así que un comando solo lleva Ⓓ si de verdad es de dueño
  y Ⓐ si de verdad pide administrador; sin bandera, sin marca.
· 🔘 Botones de Shin-MD portados: el menú ya lleva la lista desplegable
  («Explorar categorías», «Categorías (.menucat)», «Ver todo»). Tres cosas que se
  arreglaron al portarlos: ya no se envuelve en viewOnceMessage (era lo que
  dejaba los botones grises o invisibles en WhatsApp Web), se mandan los nodos
  binarios que WhatsApp exige (lib/wa-nodes.js; sin ellos el servidor acepta
  el mensaje y el teléfono no pinta nada) y más de tres botones piden la hoja
  inferior en vez de perderse en silencio. Interruptores: BOTONES=off los
  apaga todos, BOTONES_FORMATO=plantilla|clasico cambia el formato cuando un
  teléfono contesta «actualiza WhatsApp» y BOTONES_VIEWONCE=1 recupera el
  envoltorio viejo.
· 🛡️ Anti-ban portado de Shin-MD (lib/antiban.js): una sola cola para todos
  los envíos, con espera al azar (no fija) entre mensajes, más espera en los
  textos largos, y calentamiento diario (una cuenta nueva no manda 500
  mensajes el primer día; el tope sube durante una semana y se guarda en la base,
  así que reiniciar no lo pone a cero). Si la conexión se cae, el mensaje espera
  y sale al volver; si un envío se queda sin respuesta, no se repite — mejor
  perder uno que mandar dos iguales. Un vigilante mide el riesgo (desconexiones,
  errores, fallos y un 403), pausa los envíos a partir de 80 y reconecta a partir
  de 95, con tope de 3 intentos para no caer en un bucle. Se mira con .warmup.
· 💰 Economía completa: .weekly y .monthly con racha y techo, .roulette
  con la ruleta europea de verdad (×2 color y paridad, ×36 número, el 0 para la
  casa), .ppt, .casino y .coffer — lo que guardas en la caja fuerte no lo
  alcanza .rob, y no da intereses (no se fabrica dinero).
· 🛡️ Administración de grupo: cambiar nombre, descripción y foto
  comprobando que WhatsApp lo aplicó; enlace e invite con revocación;
  fijar mensajes; .count, .topcount y .topinactive con contador propio; y
  .bot off que apaga el bot de verdad (lo respeta el router, no cada plugin).
· 🧾 Perfil: descripción, género, afición y cumpleaños con validación de
  fecha real (rechaza 32/13 y 29 de febrero cuando no toca), .level, .lboard
  y .afk que avisa cuando te mencionan y se quita solo al escribir.
· 🔔 Utilidades con API probada: .crypto (precio en dólares y pesos),
  .letra, .acortar y .tourl. Si un servicio no responde, el comando lo dice:
  nunca enseña un dato viejo como si fuera de ahora.
· 👑 Owner: .getplugin para leer un plugin desde el móvil, .nuevo y
  .delplugin para crearlos y borrarlos con confirmación, .botinfo,
  .blocklist y .block/.unblock comprobados contra la lista real.
· 🩺 Diagnóstico: .health, .runtime, .status, .lid y .cache con
  datos medidos (RAM, tiempo encendido, tamaño de la base). Y .compat: manda
  cuatro mensajes numerados (texto, botones, hoja inferior y álbum) para saber
  cuál no lee un teléfono concreto, sin adivinar.
· 📤 Editar desde el móvil: .subir <ruta> | <contenido> escribe un archivo
  del bot sin abrir Termux (ruta encerrada en la carpeta del bot, .git/
  protegido), .eval <código> ejecuta JavaScript y .getplugin enseña el código.
· ♻️ El bot ya no se queda apagado: npm run vigia lo levanta solo si se cae
  y .restart funciona también sin supervisor (antes hacía process.exit y en
  Termux se quedaba muerto). Si se cae 5 veces en 2 minutos, se rinde y lo dice.
· 🖼️ Álbumes nativos (lib/album.js): varias fotos en una sola tarjeta, la
  misma mecánica que usa el teléfono.
· 🧪 npm run humo: llama a los plugins con un contexto falso y caza los que
  revientan — lo que node --check no ve.
· 🛠️ .fix ya no borra tu trabajo: si hay cambios sin subir, guarda un
  parche en tmp/ y pide confirmación antes de tocar nada.
· 🧩 Un solo sitio para el cliente: todo importa de lib/baileys.js, con
  @itsliaaa/baileys por defecto y respaldo automático al oficial si no carga.
· 📄 Licencia AGPL-3.0 con NOTICE de procedencia: ver Licencia
</details>

---

> 🌐 Nuestras Redes y Comunidad

**¡Únete a nuestros canales oficiales y participa en la comunidad!**

<div align="center">
  <a href="https://whatsapp.com/channel/0029VbDLUk5H5JLsWeYxxD1d">
    <img src="https://img.shields.io/badge/Canal_1-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Canal 1"/>
  </a>
  <a href="https://whatsapp.com/channel/0029Vb758GP6rsQkqWy5Xm2j">
    <img src="https://img.shields.io/badge/Canal_2-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Canal 2"/>
  </a>
  <br/>
  <a href="https://chat.whatsapp.com/FAWaPaXIcbpLxpcq823WiE">
    <img src="https://img.shields.io/badge/Comunidad-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Comunidad"/>
  </a>
  <a href="https://chat.whatsapp.com/IY9no7NYC4PKdLQkmqc2Z5?s=cl&p=a&iam=2">
    <img src="https://img.shields.io/badge/Grupo_Oficial-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Grupo Oficial"/>
  </a>
</div>

---

📄 Licencia

Este proyecto se distribuye bajo GNU AGPL-3.0 (archivo LICENSE,
texto completo de la Free Software Foundation).

Qué obliga, en corto (el texto de LICENSE manda):

1. Si distribuyes el bot, tienes que entregar también el código fuente.
2. Si lo ofreces como servicio por red, quien lo use tiene derecho a pedir el código de la versión que corre.
3. Las modificaciones se mantienen bajo AGPL-3.0 y hay que decir qué se cambió.
4. Hay que conservar los avisos de copyright y el archivo NOTICE.

Procedencia, sin adornos — el detalle está en NOTICE:

Parte Autoría Licencia
Núcleo en piezas (boot/), lógica de lib/, puertas de CI y pruebas riokuroxi-svg AGPL-3.0-only
Ado-Bot (base original) Sergio Dev el repo no traía archivo de licencia; su package.json declaraba ISC
Comandos portados de Shin-MD riokuroxi-svg AGPL-3.0-only (los archivos portados llevan su cabecera)
Cliente de WhatsApp @itsliaaa/baileys · respaldo @whiskeysockets/baileys MIT (dependencias declaradas, no código incluido)

Lo portado de Shin-MD no se puede relicenciar: entra con su AGPL, y por eso el
conjunto queda en AGPL-3.0. Cada archivo que viene de ahí lo dice en su primera
línea.

---

🤝 Créditos

<div align="center">

<table>
  <tr>
    <td align="center" width="33%">
      <a href="https://github.com/SergioOficial">
        <img src="https://github.com/SergioOficial.png" width="100" alt="Sergio"/><br/>
        <b>Sergio Dev</b><br/>
        <sub>💫 Creador y Lead Developer</sub>
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

📚 Cliente base: @itsliaaa/baileys (respaldo automático a @whiskeysockets/baileys)

---

⭐ Si te gusta el proyecto, dale una estrella ⭐

Hecho con 💫 desde Cuba, Colombia y México  para el mundo

</div>

---

<sub>Escrito por [SergioOficial](https://github.com/SergioOficial)· [Ado-Bot](https://github.com/SergioOficial/ado-bot) · AGPL-3.0-only · repositorio.</sub>