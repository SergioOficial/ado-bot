# Cliente de WhatsApp: qué se cambió y por qué

_8-nov-2026 · rama `dev`_

## 1. El error «actualiza WhatsApp» no era del móvil

Baileys se presenta ante WhatsApp con un número de revisión de WhatsApp Web.
Si ese número es viejo, WhatsApp cierra la conexión y mucha gente lo interpreta
como «actualiza tu WhatsApp». El teléfono no tiene nada que ver.

El bot pedía la versión así:

```js
const { version, isLatest } = await fetchLatestBaileysVersion();
```

Esa función **no pregunta a WhatsApp**: lee un archivo de versión del
repositorio de Baileys, que se actualiza a mano. Medido hoy, con el bot real:

| Fuente | Versión que devuelve |
|---|---|
| `fetchLatestBaileysVersion()` (paquete oficial rc14) | `2.3000.1043857760` |
| `fetchLatestBaileysVersion()` (fork itsliaaa) | `2.3000.1053373443` |
| `fetchLatestWaWebVersion()` (pregunta a `web.whatsapp.com/sw.js`) | `2.3000.1053864959` |

Casi **un mes de revisiones** de diferencia. Y sigue subiendo: en dos
ejecuciones seguidas del verificador dio `…3864959` y `…3876358`.

**Arreglo:** `lib/wa-version.js` pregunta primero a WhatsApp y usa la del
repositorio solo si no hay internet. El arranque dice de dónde salió:

```
📦 Versión de WhatsApp Web: 2.3000.1053864959 (preguntada a WhatsApp · el paquete trae 2.3000.1053373443)
```

Si algún día vuelve a caerse por versión, el log lo dice en la primera línea en
vez de dejarlo a la adivinación. Además, cuando WhatsApp cierra con el código
**405**, el bot lo explica en vez de reconectar en silencio para siempre.

## 2. El cliente se cambia en un solo sitio

Todo el bot importa de `lib/baileys.js`, nunca del paquete directamente:

| Antes | Ahora |
|---|---|
| `from "@whiskeysockets/baileys"` en `index.js` y 4 plugins | `from "./lib/baileys.js"` |

`lib/baileys.js` intenta el fork y, si no está instalado o no carga, cae al
oficial **diciéndolo en el log**. Para forzar el oficial sin tocar código:

```bash
BAILEYS_PACKAGE=@whiskeysockets/baileys npm start
```

Y si un paquete no exporta algo que el bot usa, se para al arrancar con el
nombre exacto de lo que falta, en vez de fallar a mitad de un comando.

## 3. Trampa del fork `@itsliaaa/baileys`: no es instalar y ya

Instalado solo, **arranca y se cae a los dos segundos**:

```
Error: Cannot find package 'better-sqlite3'
  imported from node_modules/@itsliaaa/starforge/lib/util/module.js
```

Su dependencia `@itsliaaa/starforge` importa `better-sqlite3` y compañía, y
`npm` no las instala porque están declaradas como *peer* opcionales. Por eso
`package.json` ahora incluye:

```json
"better-sqlite3": "^11.10.0",
"ws": "^8.22.2",
"qr": "^0.7.2"
```

`better-sqlite3` es un módulo **nativo**: en Linux de 64 bits baja binario ya
compilado, pero en Termux/ARM puede necesitar `python`, `make` y `clang` para
compilarse. Si no compila, el bot no arranca.

Lo bueno del fork, medido: el paquete son **3 dependencias** contra **72** del
oficial, y su WebAssembly viene incrustado en el propio `dist` (no hay binario
suelto que se pierda en la instalación).

## 4. Botones: una sola implementación

`lib/botones.js` arma los botones nativos (`quick_reply`, `cta_copy`, `cta_url`,
`cta_call`, `cta_reminder`) y tiene respaldo: si el envío falla, manda el mismo
texto con las opciones escritas, así la persona nunca se queda sin la
información.

También sabe leer la pulsación (`botonPulsado(m)`), que es lo que permite que un
menú con botones haga algo al tocarlo.

Comprobado con el proto del paquete instalado, ida y vuelta por bytes: los
campos `interactiveMessage`, `nativeFlowMessage` y
`interactiveResponseMessage.nativeFlowResponseMessage` sobreviven enteros.

## 5. Reconexión

Antes, cada `close` lanzaba un `startLevi()` nuevo. Dos cierres seguidos (lo
normal cuando WhatsApp está inestable) dejaban **dos sockets vivos a la vez**,
cada uno con su lista de oyentes, y el bot contestaba dos veces. Ahora hay un
candado: un solo reconectador, con 2 s de espera.

## 6. `npm run verificar`

Comprueba sin abrir WhatsApp: qué cliente cargó y que traiga todo, que los
botones viajen enteros, qué versión se va a anunciar, que los 92 plugins tengan
sintaxis válida, y que la lista de owners esté bien formada. Sirve para saber si
un fallo es del bot o de la sesión antes de culpar al teléfono.

---

<sub>Escrito por **[SergioOficial](https://github.com/SergioOficial)** · Levi-Bot · AGPL-3.0-only · [repositorio](https://github.com/SergioOficial/Levi-bot).</sub>
