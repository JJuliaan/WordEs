# Wordle en Español — Discord Activity

Esto es distinto al bot: acá el juego se ve *dentro* del panel de Discord,
como en la captura que mandaste. Tiene dos partes que corren juntas:

- `server/` — Python (FastAPI). Tiene toda la lógica del juego y sincroniza
  a los jugadores en tiempo real por WebSocket.
- `client/` — JavaScript (React + Vite). Es la pantalla que Discord muestra
  dentro del iframe. Discord *exige* que esta parte sea web (HTML/CSS/JS);
  no hay forma de hacerla en Python.

## 1. Configurar la Activity en el Developer Portal

1. Andá a la misma aplicación que ya creaste para el bot (o creá una nueva)
   en https://discord.com/developers/applications
2. En el menú izquierdo, entrá a **Activities → Settings**.
3. Activá **"Enable Activities"**.
4. Copiá el **Application ID** (es el mismo que el Client ID) — lo vas a
   necesitar en los `.env` de ambas partes.
5. En **OAuth2 → General**, copiá también el **Client Secret** (dale a
   "Reset Secret" si no lo tenés a mano). Este va SOLO en el `.env` del
   servidor, nunca en el del cliente ni en el navegador.

## 2. Instalar y correr el servidor (Python)

```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Editá `server/.env` y completá `DISCORD_CLIENT_ID` y `DISCORD_CLIENT_SECRET`.

```bash
uvicorn main:app --reload --port 8000
```

Dejalo corriendo en esa terminal.

## 3. Instalar y correr el cliente (React)

En OTRA terminal:

```bash
cd client
npm install
cp .env.example .env
```

Editá `client/.env` y completá `VITE_DISCORD_CLIENT_ID` (el mismo Application ID de antes).

```bash
npm run dev
```

Esto levanta el frontend en `http://localhost:5173`, con el proxy que ya
configuramos para que `/api` y `/ws` salten hacia el servidor Python del
puerto 8000.

## 4. Exponerlo a internet con un túnel (necesario para probar)

Discord no puede cargar `localhost` dentro del iframe — necesita una URL
pública con HTTPS. Para desarrollo, lo más simple es un túnel gratuito:

```bash
# Instalar cloudflared (una sola vez)
# Mac:      brew install cloudflared
# Windows:  winget install --id Cloudflare.cloudflared
# Linux:    revisá https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

cloudflared tunnel --url http://localhost:5173
```

Te va a dar una URL tipo `https://algo-al-azar.trycloudflare.com`. Copiala.

## 5. Decirle a Discord dónde está tu app

De vuelta en el Developer Portal, en **Activities → Settings → URL Mappings**:

- **Root Mapping**: pegá la URL del túnel (sin `https://`, solo el dominio,
  ej: `algo-al-azar.trycloudflare.com`)

Guardá los cambios.

## 6. Probarlo en Discord

1. Necesitás **Modo desarrollador** activo (Configuración → Avanzado).
2. Entrá a un servidor donde tengas la app instalada como Activity (en
   **Installation** del Developer Portal, asegurate de tener el "Guild
   Install" habilitado, e invitá la app a tu servidor si no lo hiciste).
3. Entrá a un canal de voz.
4. Al lado de la barra de mensajes o en el ícono de cohete/apps, buscá tu
   Activity bajo "Desarrollo" y lanzala.

Todos los que entren a esa misma Activity (mismo canal) van a compartir el
mismo tablero — el `instanceId` que da el SDK de Discord agrupa
automáticamente a los jugadores de la misma sala.

## Notas importantes

- **Cada vez que reiniciés `cloudflared`, la URL cambia** (a menos que
  configures un túnel con nombre fijo). Si eso pasa, actualizá el Root
  Mapping en el Developer Portal.
- El estado del juego vive en memoria en `server/websocket_juego.py` (diccionario
  `salas`) — si reiniciás el servidor, las partidas en curso se pierden.
  Para producción real, eso se guardaría en una base de datos.
- `palabras.py` y la lógica de `juego.py` son casi idénticos a los del
  proyecto del bot — podés unificar ambos proyectos más adelante si querés
  evitar tener el código duplicado.
