# Sub-bots: cuántos hay, cómo se levantan y cómo no se cuelgan

> Documento de referencia del gestor de sub-bots de Ado-Bot. Sirve también para
> portarlo a otro bot (Shin-MD comparte el mismo esqueleto).

---

## 1. Qué es un sub-bot

Una sesión de WhatsApp **adicional** que corre dentro del mismo proceso. El bot
principal abre un socket por cada cuenta vinculada; cada socket atiende sus
chats con su propio `sock` y su propia sesión en disco.

Los dos caminos para crear uno:

| Comando | Quién | Qué hace |
|---|---|---|
| `.code` | cualquiera | Pide código de vinculación para **su propio** número. Gratis. |
| `.jadibot <número>` | dueño o Premium | Lo mismo, pero para otro número. |

Los dos terminan en la misma función: `startSubbot(padre, jid, remoteJid, reply, method, creador)`.

---

## 2. Dónde vive la información (y por qué se contaba mal)

Hay **dos** fuentes, y son cosas distintas:

```
<raíz>/sub/SubBots/<numero>/      ← sesión guardada (creds.json)
<raíz>/sub/SubConfigs/subconfig_<numero>.json  ← ajustes + dueños: { owners: [] }
```

Y en memoria, el gestor (`boot/subbots.js`) sabe qué está pasando **ahora**:

| Conjunto | Significa |
|---|---|
| `activos` | socket abierto y atendiendo (conectado) |
| `sockets` | hay socket, quizá todavía no abrió (conectando) |
| `intentos` | se cayó y tiene reintento agendado (reintentando) |
| `enCurso` | se está levantando en este instante (anti-reentrada) |

**El error histórico:** `.bots` buscaba los sockets en `global.conns`, un arreglo
que **nadie llena**. Como no encontraba nada, caía a «solo el principal» y
contestaba *«tienes 1 sub-bot»* aunque hubiera diez conectados. `.serbot`, por su
parte, leía una carpeta `./subs` que no existe: siempre decía «no tienes bots
vinculados».

**La regla ahora:** toda cuenta sale de `lib/inventario-subbots.js`, que mezcla
las tres listas del gestor con las sesiones del disco, sin duplicar y con un
estado por cuenta. `.bots`, `.serbot` y `.revivirsubs` usan esa misma función.

### Estados

Del más vivo al más muerto; gana el primero que aplique:

| Estado | Emoji | Qué pasa |
|---|---|---|
| `conectado` | 🟢 | el socket está abierto |
| `conectando` | 🟡 | hay socket, aún no abre |
| `reintentando` | 🟠 | se cayó; hay reintento agendado (con su número de intentos) |
| `apagado` | ⚪ | hay sesión en disco, pero no está arrancado |

`vinculado` es un dato aparte: hay `creds.json`, o sea que se puede arrancar sin
volver a pedir código.

---

## 3. Cómo se cuelga, y cómo se evita

Tres cerrojos, todos en `boot/subbots.js`:

**Techo de cuentas (515).** WhatsApp corta la conexión con `515` cuando entran
demasiados sockets seguidos. `maximo` limita cuántos hay a la vez; al llegar, los
demás esperan en vez de insistir.

**Techo de red.** Un sub-bot que se cae no se reintenta en bucle: `decideReintento`
espera **2 s → 4 → 8 → 16 → 32 → 60 s** (máximo 5 intentos) y da la cuenta por
perdida hasta que alguien la levante a mano. Antes se reintentaba sin freno y un
Wi-Fi flojo convertía el grupo en una tormenta de reconexiones.

**Anti-reentrada.** `enCurso` marca la cuenta mientras se levanta. Sin eso, dos
`startSubbot` del mismo número (por ejemplo `.code` pulsado dos veces) abrían dos
sockets y el segundo tumbaba al primero.

Además, `restaurarSubbots` levanta las sesiones de disco **de una en una**, con
pausa entre ellas: diez cuentas a la vez es exactamente la señal que mira el
detector de anomalías de WhatsApp.

---

## 4. El informe que se le muestra a la gente

`.bots` contesta la pregunta literal —*cuántos tengo*— y luego el detalle:

```
ꕥ Sub-bots de este bot

ੈ❖ Sub-bots en total › 3
ੈ✰ Conectados ahora › 1 de 15
ੈ◌ Conectando › 1
ੈ✿ En reintento › 1

➭ Detalle
🟢 conectado @5211111111111
🟡 conectando @5222222222222
🟠 reintentando (2 intentos) @5233333333333
```

Y si se pregunta desde un grupo, añade cuáles de esos están **en este grupo**
(se le pregunta al grupo, no al gestor: son cosas distintas).

`.serbot` añade gestión individual: `estado`, `on`, `delete`, `code` — solo sobre
lo propio, o todo si quien escribe es el dueño del bot. El dueño de un sub-bot se
apunta en `subconfig_<numero>.json` en `owners`, así que se conserva entre
reinicios.

`.revivirsubs` levanta los vinculados y **espera** unos segundos antes de
informar: decía «0 activos» porque contaba en el mismo instante en que los pedía,
cuando ninguno había abierto todavía.

---

## 5. Portarlo a otro bot (Shin-MD)

Se puede llevar sin arrastrar medio proyecto:

| Archivo | Qué es | Portable |
|---|---|---|
| `lib/inventario-subbots.js` | conteo y estados, sin dependencias | **tal cual** |
| `decideReintento` / `esperaDeReintento` (`boot/subbots.js`) | techo de reintentos | **tal cual** (funciones puras) |
| `plugins/subbots/bots.js` | el informe | adaptando el estilo del mensaje |
| `plugins/subbots/serbot.js` | gestión + panel HTML | adaptando el panel |
| `plugins/owner/revivirsubs.js` | levantar todos | adaptando el `ctx` |

Lo único que hay que respetar es la forma del resumen que se le pasa:

```js
inventarioSubbots({
  resumen: { numeros, conectando, reintentando: [{ numero, intentos }], maximo },
  vinculadas,            // números con sesión en disco
  nombreDe: (n) => "",   // opcional
});
// → { filas, total, vinculadas, activos, conectando, reintentando, apagados, maximo }
```

Si el otro bot no tiene gestor, basta con pasarle `{ numeros: [...sockets.keys()], vinculadas: [...] }`
y el inventario funciona igual: es una función pura, sin `import` de nada del
proyecto ni acceso a disco.

---

## 6. Lo que se aprendió

- **Un contador nunca debe buscar su dato en un sitio que nadie escribe.** Si el
  informe miente, casi siempre es porque lee otra fuente que la que produce el
  hecho.
- **«No hay nada» y «todavía no abrió» no son lo mismo.** El estado `conectando`
  existe justo para eso.
- **Un botón sin comando detrás es peor que no tener botón.** El panel de
  `.serbot` mandaba tres órdenes que el plugin ignoraba: el usuario pulsaba
  «Eliminar» y no pasaba nada, y encima el mensaje repetía el mismo panel.
- **Reintentar sin techo no es robustez, es ruido.** El techo de 5 intentos con
  espera creciente evita reconexiones en cadena ante un corte de red.
