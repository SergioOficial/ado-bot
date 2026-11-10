# El aviso «actualiza WhatsApp»: qué es y de dónde sale

_10-nov-2026 · investigación_

## El síntoma

Cada tanto, en lugar de la tarjeta con botones, el mensaje dice:

> *Recibiste un mensaje que no es compatible con tu versión de WhatsApp.*
> Actualizar WhatsApp

Y lo peor: **a veces sale y a veces no, con el mismo mensaje**.

## Lo que está comprobado (no es opinión)

1. **Ese cartel no lo pone el bot: lo pone el teléfono de quien lo recibe.**
   WhatsApp recibe el mensaje, lo acepta, y al dibujarlo se encuentra con un
   tipo de contenido que su cliente no sabe pintar. Por eso en la terminal del
   bot todo sale «enviado»: enviar y poder leerlo son cosas distintas.

2. **El tipo de mensaje que usamos hoy es el moderno**, `interactiveMessage` →
   `nativeFlowMessage`. Ese formato lo pintan los clientes recientes. Los que no
   lo soportan muestran exactamente ese aviso. Está documentado por quien
   mantiene un fork con los dos caminos:

   > `interactive` (el moderno) — los clientes sin soporte muestran «Recibiste un
   > mensaje que no es compatible con tu versión de WhatsApp».
   > `buttons` (el clásico) — todos los clientes la ven como texto normal.
   > — README de `ultra-baileys`

3. **El envoltorio `viewOnceMessage` (el truco de 2022) también provoca el
   aviso**, y además rompe los botones en WhatsApp Web y de escritorio. Por eso
   en `lib/botones.js` el interactivo va en la raíz y el envoltorio quedó detrás
   de `BOTONES_VIEWONCE=1`. Confirmado por el arreglo equivalente de
   evolution-api (quitar el viewOnce y volver al formato legado).

4. **Dos nodos `biz` en el mismo envío hacen que WhatsApp descarte el mensaje
   sin avisar.** Nosotros mandamos el nuestro a mano (`lib/wa-nodes.js`); la
   librería instala uno propio si detecta botones. La librería es respetuosa:
   si ve el nuestro, no pone el suyo. Comprobado leyendo
   `lib/Socket/messages-send.js` de `@itsliaaa/baileys@0.5.1`.

5. **La librería que usa el bot ya sabe mandar el formato clásico.** En
   `lib/Utils/messages.js` (0.5.1):

   | Lo que se manda | Lo que sale en el cable |
   |---|---|
   | `{ buttons: [...] }` | `buttonsMessage` (clásico, respuesta rápida) |
   | `{ sections: [...] }` | `listMessage` con `listType: SINGLE_SELECT` (el viejo) |
   | `{ templateButtons: [...] }` | `templateMessage` |
   | `{ interactiveMessage: ... }` | el moderno `nativeFlowMessage` |

   O sea: **no hay que cambiar de librería para dejar de ver el aviso**, solo
   cambiar el camino.

## Lo que sigue siendo hipótesis (dicho como tal)

- Que el aviso aparezca **solo cuando la tarjeta va citando otro mensaje**
  (`quoted`). En tu captura el mismo menú sale bien dos veces y mal la tercera.
  No está verificado: hay que medirlo.
- Que el aviso en Android venga del `single_select` (la lista desplegable) y en
  Web del `native_flow`. Tampoco verificado.

## Cómo se mide (sin adivinar)

`.compat`, en privado, manda pruebas numeradas y se mira cuál sale con el
aviso. Hoy manda texto, tarjeta moderna, hoja inferior y álbum. El siguiente
paso es añadir tres pruebas más:

| Nº | Qué manda | Qué descarta |
|---|---|---|
| 5 | `buttonsMessage` clásico (respuesta rápida) | si el aviso viene del formato moderno |
| 6 | `listMessage` legado (`SINGLE_SELECT`) | si el aviso viene de la lista |
| 7 | la tarjeta con y sin `quoted` | si el aviso lo provoca la cita |

## El arreglo probable (a falta de medirlo)

1. Respuesta rápida → `buttonsMessage` clásico. Se pinta en todos los clientes y
   lo que devuelve el teléfono es `buttonsResponseMessage`, que todo el mundo ve
   como texto normal.
2. Enlaces, copiar, llamar y lista desplegable **no tienen versión clásica
   equivalente** para todos los clientes: si el aviso viene de ahí, la salida es
   mandarlos como texto con la opción escrita (`respaldo`), no forzarlos.
3. Selector en el entorno (`BOTONES_FORMATO=clasico|moderno`) para poder
   cambiar sin tocar plugins, igual que `BOTONES=off`.
4. Y el aviso nunca se queda sin respuesta: si el envío falla, el texto sale con
   las opciones escritas.

Nada de esto promete que WhatsApp deje de cambiar el formato: es su protocolo y
lo mueve cuando quiere. Lo que sí se puede es mandar el formato que más clientes
entienden y saber cuál falla en cada teléfono.

---

<sub>Escrito por **[SergioOficial](https://github.com/SergioOficial)** · Levi-Bot · AGPL-3.0-only · [repositorio](https://github.com/SergioOficial/Levi-bot).</sub>
