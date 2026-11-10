# Punto de retorno (checkpoint)

_8-nov-2026_

Antes de tocar `main` se dejó una **etiqueta** en el último commit bueno, el que
había antes de todo esto:

```
antes-del-porte-shin  →  01f6c7f  «📖 Docs: Nuevo README profesional y arquitectura final»
```

Está en GitHub, en el repo, así que **no se pierde** aunque se borre la carpeta
local o se reinstale el servidor:

```bash
git tag -l                        # ver la etiqueta
git show antes-del-porte-shin     # ver qué había
```

## Si algo sale mal y hay que volver atrás

Desde el servidor donde corre el bot, con la carpeta del proyecto:

```bash
# 1. Guardar nada: primero, apuntar en algún sitio el commit actual
git log --oneline -1

# 2. Volver EXACTAMENTE al estado de antes
git fetch --tags
git reset --hard antes-del-porte-shin

# 3. Volver a instalar dependencias (el package.json cambió: ahora incluye
#    @itsliaaa/baileys y sus tres paquetes acompañantes)
npm install

# 4. Arrancar
npm start
```

`git reset --hard` **borra los cambios locales**: si tienes algo sin subir en el
servidor, cópialo antes (`cp -r plugins /ruta/de/respaldo`).

### Volver atrás solo un poco

Si el problema es de un archivo concreto:

```bash
git checkout antes-del-porte-shin -- plugins/utils/qr.js   # un archivo
git checkout antes-del-porte-shin -- plugins utils lib     # carpetas enteras
```

### Deshacer el punto de retorno (si todo va bien)

Cuando esté claro que no hace falta:

```bash
git tag -d antes-del-porte-shin
git push origin :refs/tags/antes-del-porte-shin
```

## Copia de seguridad de los datos del bot

El checkpoint es del **código**, no de los datos. Los usuarios, la economía y
las advertencias están en `lib/database.json`, que **no se sube a GitHub**.
Antes de cualquier cambio grande:

```bash
cp lib/database.json lib/database.antes-del-porte.json
```

Y si hubiera que restaurarlo: se copia de vuelta a `lib/database.json` con el
bot **apagado** (con el bot encendido, el autoguardado lo pisa cada segundo).

---

<sub>Escrito por **[SergioOficial](https://github.com/SergioOficial)** · Levi-Bot · AGPL-3.0-only · [repositorio](https://github.com/SergioOficial/Levi-bot).</sub>
