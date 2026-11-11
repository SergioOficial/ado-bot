# Seguridad: qué está tapado y qué no

Este documento dice, sin adornos, qué se comprueba antes de tocar la red o el
disco y qué sigue siendo responsabilidad de quien monta el bot. Si algo de aquí
no se cumple, es un fallo: ábrelo.

## Enlaces que llegan por WhatsApp

Todo lo que el bot pide a Internet por un enlace que escribió un usuario pasa
por `lib/red-segura.js`:

| Comprobación | Por qué |
| --- | --- |
| Solo `http` y `https` | `file://`, `gopher://` y compañía no tienen nada que hacer aquí |
| Sin credenciales en la URL | `http://usuario:clave@host/` esconde el destino real |
| IP privada, loopback, enlace local, CGNAT, multicast | `127.0.0.1`, `192.168.x.x`, `169.254.169.254` (metadatos de la nube) |
| Nombres internos | `localhost`, `*.local`, `*.internal`, `metadata.google.internal` |
| DNS resuelto y validado | un dominio público puede resolver a una IP privada |
| Sin redirecciones | un `302` desde un dominio legítimo hacia `127.0.0.1` es el truco de siempre |
| Tope de tamaño y plazo | 5 MB y 20 s por defecto; se corta la lectura aunque el `content-length` mienta |

Los comandos que lo usan: `.get`/`.fetch`, y desde esta versión `.mediafire` y
`.apk`. En `.mediafire` además se exige que el host sea de Mediafire —mirando el
hostname ya validado, no el texto del enlace— y el archivo se descarga y se
manda como buffer: si se pasara la URL, quien la sirve podría cambiarla después
por otra cosa. En `.apk` el enlace que recibe WhatsApp se valida igual (host de
Aptoide y `https`).

## Archivos que llegan por WhatsApp

`.sticker` acepta imágenes y vídeos de cualquiera. Antes de pasarlos a
`wa-sticker-formatter` se mira la cabecera (`lib/sticker-seguro.js`) y se
rechazan **ASF/WMA, ICNS, HEIF/AVIF y JPEG XL**, que son los contenedores donde
el detector de tipos de esa librería (`file-type` 16) tiene avisos abiertos de
bucle infinito. Un archivo así dejaba el proceso girando.

## Órdenes al sistema

- `.exec` es de owner y ejecuta lo que le pidan: es una puerta abierta **a
  propósito**. Si no sabes lo que estás haciendo, no lo uses.
- `ffmpeg` (`.tts`) se lanza con `execFile` y una lista de argumentos: ninguna
  comilla o `;` de un nombre de archivo puede convertirse en una orden.

## Dependencias

`npm audit --omit=dev --audit-level=high` es una puerta del CI. Hoy quedan **dos
avisos moderados**, los dos en la misma cadena:

```
file-type · moderado · 13.0.0 - 21.3.0   (viene dentro de wa-sticker-formatter)
wa-sticker-formatter · moderado · >=2.0.0
```

No hay arreglo sin cambiar de librería: `file-type` corrigió el problema en la
21, que cambia la API y rompe `wa-sticker-formatter`. Forzarla con `overrides`
se probó y rompe la creación de stickers (`_getMimeType`), así que se queda
como está y se tapa por el lado de la entrada (ver arriba).

Lo que sí se forzó con `overrides`, con las pruebas y el humo en verde:

| Paquete | Antes | Ahora | Por qué |
| --- | --- | --- | --- |
| `axios` (anidado) | 0.21.4 | 1.21.0 | avisos de SSRF/CSRF y fuga de credenciales |
| `minimatch` | 3.0.8 | 3.1.5 | ReDoS por comodines repetidos |
| `image-size` | 1.2.1 | 2.1.0 | bucles infinitos con JXL, HEIF e ICNS |

Resultado: **de 9 avisos (8 altos, 1 moderado) a 2 moderados**, y ninguno alto.

## Lo que NO cubre esto

- Nada de esto se ha probado contra WhatsApp real: el envío y la vinculación se
  validan con la suite, no con un teléfono.
- Las APIs de terceros (Aptoide, los servicios de descargas) se dan por buenas:
  si una devuelve algo malicioso, el bot se lo cree.
- El bot corre con el usuario del sistema que lo arranca. En Termux es el tuyo.
