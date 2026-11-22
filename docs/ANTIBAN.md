# Por dónde puede salirse el anti-ban

_Generado con `npm run auditar-antiban`. Señala los sitios que mandan mensajes sin pasar por la cola de `lib/antiban.js`._

- Archivos con algún hallazgo: **17**
- Hallazgos fuera de los sitios que implementan el transporte: **9**
- De esos, graves: **8**

## Hallazgos a revisar

| Archivo | Línea | Qué hace | Por qué importa |
|---|---|---|---|
| `plugins/admin/welcome.js` | 53 | manda un mensaje por cada destinatario de una lista | escribir a una lista entera es el patrón que WhatsApp llama «mensajería masiva». |
| `plugins/descargas/pinterest.js` | 119 | manda dentro de un bucle | un bucle de envíos sale en ráfaga si nadie lo frena. |
| `plugins/owner/broadcast.js` | 192 | manda dentro de un bucle | un bucle de envíos sale en ráfaga si nadie lo frena. |
| `plugins/owner/revivirsubs.js` | 36 | manda dentro de un bucle | un bucle de envíos sale en ráfaga si nadie lo frena. |
| `plugins/owner/sonda.js` | 137 | usa relayMessage a mano | sí pasa por el envoltorio del socket, pero salta la ruta normal de mensajes. |
| `plugins/perfil/afk.js` | 107 | manda un mensaje por cada destinatario de una lista | escribir a una lista entera es el patrón que WhatsApp llama «mensajería masiva». |
| `plugins/stickers/emojimix.js` | 67 | manda dentro de un bucle | un bucle de envíos sale en ráfaga si nadie lo frena. |
| `plugins/stickers/stickers.js` | 24 | manda dentro de un bucle | un bucle de envíos sale en ráfaga si nadie lo frena. |
| `plugins/utils/welcome.js` | 40 | manda un mensaje por cada destinatario de una lista | escribir a una lista entera es el patrón que WhatsApp llama «mensajería masiva». |

## Los sitios que sí implementan el transporte

- `boot/arranque.js`
- `boot/subbots.js`
- `boot/vigilantes.js`
- `lib/album.js`
- `lib/antiban.js`
- `lib/botones.js`
- `lib/encuestas.js`
- `lib/juego-html.js`

## Revisión de los hallazgos

Cada sitio que aparece arriba se ha mirado uno a uno. Ninguno se salta la cola;
los que mandan de verdad lo hacen por el socket envuelto, así que esperan turno,
cuentan para el tope y encienden el «escribiendo…».

| Archivo | Veredicto | Por qué |
|---|---|---|
| `plugins/admin/welcome.js` | rompe | manda una bienvenida por cada miembro añadido, y siempre al mismo grupo (el chat donde ocurrió). Si añaden a diez de golpe, son diez fotos seguidas: por eso ahora la imagen falla a texto y la cola las espacia. |
| `plugins/utils/welcome.js` | rompe | igual que la anterior, pero en texto. Un mensaje por miembro añadido, al mismo grupo. |
| `plugins/perfil/afk.js` | rompe | avisa en el chat actual, una vez por usuario ausente y con marca de tiempo para no repetir. No escribe a nadie fuera del chat. |
| `plugins/descargas/pinterest.js` | rompe | manda los resultados de una búsqueda, uno detrás de otro, al chat que pidió. Es lo que la persona espera; la cola los separa. |
| `plugins/stickers/stickers.js` | rompe | paquete de stickers: varios mensajes al chat que lo pidió. |
| `plugins/stickers/emojimix.js` | rompe | mezcla de emojis: un envío por combinación pedida. |
| `plugins/owner/revivirsubs.js` | rompe | avisa a cada sub-bot de que vuelva. Son los números del propio dueño, no terceros. |
| `plugins/owner/sonda.js` | rompe | usa `relayMessage` a propósito: es la sonda de diagnóstico, manda un nodo de prueba al propio servidor para ver si contesta. No escribe a nadie. |
| `plugins/owner/broadcast.js` | **arreglado** | era el grave de verdad: mismo texto, cada 5 s, a todos los usuarios guardados. Ver abajo. |

### La difusión (`.bc`), que es la que trajo el aviso de spam

Lo que hacía: recorría `db.users` y mandaba **el mismo texto** a todos, con una
espera **fija de 5 segundos**, sin preguntar y sin mirar si esa persona había
hablado alguna vez con el bot. Ese es, palabra por palabra, el patrón que
WhatsApp llama mensajería masiva: mismo contenido, mismo ritmo, destinatarios en
frío. Un número que hace eso recibe denuncias, y con denuncias llega la
restricción y el aviso en soporte.

Lo que hace ahora:

1. Enseña a cuántos llegaría y a quiénes, y **no manda nada** hasta `.bc confirmar`
   dentro de los dos minutos siguientes.
2. Solo escribe a quien ha usado el bot (tiene economía, nivel, AFK, perfil…). A
   los guardados sin actividad no se les escribe.
3. Respeta el tope diario del anti-ban y aparta 10 mensajes de reserva para lo que
   el bot tenga que contestar ese día.
4. Máximo 25 por tanda.
5. Espera **variable** (25 s ± 12 s, con forma de campana), no un reloj.
6. Se para sola: tres fallos seguidos, o un error que parezca restricción.
7. Cuenta qué pasó: enviados, omitidos y el motivo de la parada.

El texto del mensaje no cambió: es el mismo `📢 𝐃𝐈𝐅𝐔𝐒𝐈Ó𝐍 𝐎𝐅𝐈𝐂𝐈𝐀𝐋` con el nombre
del bot al pie.

## Los metadatos: qué es cierto y qué no

La idea de que WhatsApp reconoce el mismo mensaje por el mismo metadato o la
misma firma criptográfica necesita un matiz, porque de ahí salen dos
conclusiones opuestas y solo una sirve.

**Lo que ya es distinto sin hacer nada.** Cada mensaje que sale va cifrado con su
propia clave de sesión y su propio relleno aleatorio. Dos «hola» seguidos son dos
cifrados distintos byte a byte: el contenido cifrado nunca se repite. Ahí no hay
nada que evadir.

**Lo que sí se podía repetir.** Alrededor del mensaje hay datos de contexto que el
teléfono del destinatario lee y no se ven: `messageSecret`, `templateId`,
`deviceListMetadata`. En este bot había dos cosas fijas:

- los mensajes con botones, listas y plantillas salían **sin `messageSecret`** (o
  con el mismo), cuando un teléfono pone uno nuevo de 32 bytes en cada mensaje;
- el `templateId` de las plantillas era `levi-<marca de tiempo>`, siempre con la
  misma forma.

Eso ahora lo arregla `lib/metadatos.js`: cada mensaje interactivo sale con su
propio secreto de 32 bytes al azar y su propio identificador, y `lib/antiban.js`
lo aplica a todo lo que pasa por el socket, venga del plugin que venga. **No se
toca ni una letra de lo que se ve**: hay una prueba que compara la huella de lo
visible antes y después de sellar y exige que sea la misma.

**Lo que de verdad levanta alarmas** no son los metadatos, es la conducta:
mandar el mismo texto a gente que no te ha escrito, contestar siempre en
milisegundos, hablar las veinticuatro horas, reconectar en bucle. Contra eso
están la cola, el tope diario, el calentamiento y la curva circadiana de
`lib/antiban.js`, la pausa por denuncias y el freno de la difusión.

Y una cosa que no se va a prometer: que un número no sea restringido. No existe
forma de garantizarlo desde fuera, y quien lo prometa está vendiendo humo.

## Lo que este informe no dice

No mide el riesgo de una cuenta ni promete que no la restrinjan: señala los caminos por los que un mensaje puede salir sin freno. Un archivo limpio aquí sigue pudiendo mandar cien mensajes seguidos si alguien se lo pide; para eso está el tope diario de `lib/antiban.js`.
