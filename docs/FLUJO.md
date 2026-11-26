# Menú interactivo experimental (`.flow`)

Este documento explica de dónde sale la tarjeta que aparece al reenviar el
mensaje «🎛️ Click aquí para abrir el menú», qué se puede reproducir en este bot
y qué no. Es una prueba aparte: `.menu` sigue igual.

## 1. Qué se vio en la captura

- Mensaje reenviado: `🎛️ Click aquí para abrir el menú`, con un icono de
  controles delante. Al reenviar un mensaje interactivo, WhatsApp conserva el
  texto del cuerpo y pierde la interfaz: por eso en el reenvío solo queda esa
  línea y no el botón.
- Menú abierto: cabecera «🎛️ Menú», imagen, botón «MENÚ PREMIUM», buscador
  «Buscar comando...», categorías en chips (Subbots, Grupo, Admin, Descargas…)
  y tarjetas de comandos con su prefijo.
- La barra superior dice «Menú» y cierra con una X: es una pantalla de
  **WhatsApp Flows**, no una página web abierta en el navegador.

La interfaz de dentro no se genera en el bot: se define como **Flow JSON** y se
sube a WhatsApp Manager (Business Manager → Herramientas de la cuenta → Flows).
Para abrirla se envía un mensaje interactivo de tipo `flow`; en Baileys el
botón nativo se llama `galaxy_message`. Los parámetros son
`flow_message_version: "3"`, `flow_id` (o `flow_name`), `flow_token`,
`flow_cta`, `flow_action` y `flow_action_payload` ([documentación de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow),
[ejemplo en Baileys](https://github.com/fadzzzslebew/baileys)).

Fuentes consultadas:

- <https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow>
- <https://docs.360dialog.com/docs/messaging/flows>
- <https://help.botmaker.com/es/help/3376576378795424665>
- <https://developers.cm.com/messaging/docs/whatsapp-interactive-messages>

**Conclusión sobre el texto:** la frase coincide punto por punto con el cuerpo
que se ve en el reenvío. El emoji que aparece delante en la captura es el mismo
que encabeza la tarjeta. Se buscó la frase literal en código público de GitHub
y no aparece como cadena de un proyecto conocido: es texto elegido por quien
compone el mensaje, no un literal de una librería. Lo reproducible es el
formato; la redacción es libre.

## 2. Lo que `.flow` hace aquí

El comando tiene dos caminos:

| Modo | Cuándo | Qué envía |
|---|---|---|
| Demo local | Sin `FLOW_ID`/`FLOW_NAME` | Tarjeta nativa con categorías, lista y buscador. No necesita cuenta business. |
| Flow publicado | Con `FLOW_ID` y `FLOW_TOKEN` | Botón `galaxy_message` que abre el Flow subido a WhatsApp Manager. |

La tarjeta lleva siempre el cuerpo `🎛️ Click aquí para abrir el menú` y el
encabezado `🎛️ Menú`. Usa el mismo envío de botones que el resto del bot
(`lib/botones.js`), con sus nodos binarios y su respaldo en texto.

Subcomandos:

```text
.flow                    abre el Flow publicado, o la demo si no hay uno
.flow demo               fuerza la demo local
.flow real               fuerza el Flow publicado
.flow cat <categoría>    muestra los comandos de esa categoría
.flow buscar <palabra>   busca comandos por nombre o alias
.flow estado             muestra la configuración sin enseñar el token
.flow ayuda              ayuda corta
```

Los botones de las categorías devuelven comandos reales (`flow cat ...`) y el
buscador devuelve `flow buscar ...`: la compuerta los recibe como si estuvieran
escritos con el prefijo del bot.

## 3. Puesta en marcha del modo publicado

1. Crear el Flow en WhatsApp Manager y publicarlo. La interfaz de la captura
   exige un Flow JSON con pantallas, imagen, campo de texto y chips: no se
   genera automáticamente desde un plugin.
2. Copiar el `flow_id` de ese Flow y generar un `flow_token` propio.
3. Definir las variables de entorno antes de arrancar el bot:

```bash
export FLOW_ID="1234567890123456"
export FLOW_TOKEN="un-token-unico-por-mensaje"
export FLOW_CTA="Abrir menú"        # sin emoji, 30 caracteres como máximo
export FLOW_PANTALLA="MENU"         # id de la pantalla de entrada
export FLOW_MODO="published"        # o draft mientras se prueba
# export FLOW_DATOS='{"origen":"chat"}'   # datos iniciales de la pantalla
# export FLOW_IMAGEN='https://.../cabecera.jpg'
```

4. Probar con `.flow estado` y después con `.flow real`.

Límites reales:

- Hace falta una cuenta de WhatsApp Business (WABA) con Flows habilitados.
  Un número vinculado por Baileys no crea ni publica Flows por sí solo.
- La CTA no admite emoji. El emoji va en el cuerpo y en la cabecera.
- Si el cliente no pinta Flows, la tarjeta se cae al texto de respaldo; por eso
  el cuerpo se manda siempre.
- Si el Flow no responde o el id es incorrecto, `.flow` avisa y envía la demo.

## 4. Sobre los stickers con audio y el proto

WhatsApp añadió en noviembre de 2026 los stickers con sonido: un `WebP` con
una pista `OGG/Opus` adjunta. En el protocolo aparecen un envoltorio
`audioStickerMessage` y un campo de audio dentro de `StickerMessage`
([descripción del cambio](https://github.com/flextofc804/proyects-bot-/pull/101),
[seguimiento en whatsapp-rust](https://github.com/oxidezap/whatsapp-rust/pull/2110),
[nota de prensa](https://9to5mac.com/2026/11/25/whatsapp-testing-stickers-with-audio-including-make-your-own-option/)).

Estado comprobado en este repositorio:

- `plugins/stickers/stickeraudio.js` ya parchea el proto en memoria para
  codificar el envoltorio y el audio. No añade dependencias.
- El `WAProto.proto` publicado por Baileys en `master` todavía no trae esos
  campos: `StickerMessage` llega hasta `mediaKeyDomain = 23` y el último campo
  de `Message` de esa zona es `114`. Por eso el parche es necesario.
- Hay informes comunitarios discrepantes sobre los números de campo:
  `134`/`26` en unos y `1074`/`210` en otros. Este repo usa `1074`/`210`.
  Antes de tocar esos números conviene capturar un mensaje real de un cliente
  y decodificarlo; no darlos por buenos solo por un PR ajeno.

Este cambio afecta a los stickers, no a los mensajes interactivos: `.flow`
usa `interactiveMessage`, que no se ha tocado. No se modifica
`stickeraudio.js`.

## 5. Pruebas

```bash
npm run probar
npm run sintaxis
npm run lint
```

`pruebas/flujo.test.mjs` comprueba, sin abrir WhatsApp, el texto exacto, los
parámetros del botón, la exclusión de `flow_id`/`flow_name`, la longitud de la
CTA, los ids de los botones y el buscador.
