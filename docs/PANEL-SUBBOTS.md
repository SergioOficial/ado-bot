# Panel web de sub-bots (GitHub Pages + VPS)

El panel usa la interfaz estática de `web/` en GitHub Pages y una API privada que corre junto a Ado-Bot en el VPS.

## Seguridad y almacenamiento

- GitHub Pages solo publica HTML/CSS/JavaScript; no ejecuta rutas backend ni guarda secretos.
- Las sesiones Baileys permanecen en `sub/SubBots/<numero>/` y las configuraciones existentes en `sub/SubConfigs/`. Ambas están ignoradas por Git.
- No subir `creds.json`, `app-state-sync-key`, tokens ni el contenido de `.env` al repositorio. Una carpeta con punto no vuelve privados sus archivos.
- La API exige un token aleatorio de al menos 32 caracteres, compara el secreto en tiempo constante, limita el tamaño JSON, limita solicitudes por IP y acepta un único origen CORS.
- El panel conserva el token solo en `sessionStorage` del navegador; al cerrar la pestaña/sesión se descarta.

## 1. Variables privadas en el VPS

Añade al `.env` que ya usa Ado-Bot (no lo subas a GitHub):

```env
PANEL_API_TOKEN=REEMPLAZA_POR_UN_SECRETO_ALEATORIO_DE_64_CARACTERES
PANEL_API_HOST=127.0.0.1
PANEL_API_PORT=8787
PANEL_CORS_ORIGIN=https://sergiooficial.github.io
PANEL_OWNER_NUMBER=5358090650
```

Genera el token en el VPS con:

```bash
openssl rand -hex 32
```

Usa como `PANEL_CORS_ORIGIN` el origen exacto de tu web (sin ruta final). Si tu Pages URL cambia o usas dominio propio, actualiza esa variable y reinicia Ado-Bot. `PANEL_OWNER_NUMBER` debe ser un número propietario con código de país.

## 2. Publicar la API con HTTPS

La API escucha solo en `127.0.0.1:8787`; no abras ese puerto públicamente. Coloca Nginx/Caddy delante con certificado TLS y reenvía el subdominio HTTPS al puerto local. Ejemplo de Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name api.tudominio.com;

    # Configura aquí ssl_certificate y ssl_certificate_key.
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

No uses HTTP plano desde GitHub Pages: los navegadores bloquearán las peticiones mixtas.

## 3. GitHub Pages

El workflow `.github/workflows/pages.yml` publica automáticamente `web/` al hacer push a `main`. En GitHub abre **Settings → Pages** y confirma que el origen sea **GitHub Actions**. GitHub documenta el flujo de publicación mediante Actions y los permisos `pages: write` e `id-token: write`: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

URL prevista: https://sergiooficial.github.io/ado-bot/

## 4. Funciones disponibles

- Ver el inventario y estado real de sub-bots.
- Pedir un código de vinculación y consultarlo desde el panel.
- Iniciar una sesión ya vinculada.
- Eliminar un sub-bot y su sesión (acción irreversible).

El HTML original `codes.html` incluía campos avanzados (botname, moneda, banner, etc.) y rutas `/ver-configs` y `/edit-bot`, pero esos campos no existen en el esquema operativo actual de `subconfig_<numero>.json`. No se muestran como si se guardaran: primero habría que definir qué partes del núcleo deben consumir cada ajuste.

## 5. Comprobaciones

En el VPS, después de actualizar el repositorio y reiniciar el servicio:

```bash
curl -i http://127.0.0.1:8787/api/health \
  -H "Authorization: Bearer $PANEL_API_TOKEN"
```

Desde el panel configura la URL HTTPS de la API y el mismo token. Si la API responde 401, revisa el token; si falla CORS, revisa que `PANEL_CORS_ORIGIN` coincida exactamente con el origen de Pages.
