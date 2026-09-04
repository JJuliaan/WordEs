# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Wordle clone in Spanish that runs as a Discord Activity — the game renders *inside* Discord's
iframe panel (voice channel), not as a standalone bot command. Two halves run together:

- `Server/` — Python (FastAPI). Owns all game logic and syncs players in real time over WebSocket.
- `Client/` — React + Vite. The iframe UI Discord loads. Discord requires this half to be
  web (HTML/CSS/JS); there is no way to render the Activity panel from Python.

Note: the README refers to `server/` and `client/` (lowercase); the actual directories on disk are
`Server/` and `Client/`.

## Commands

### Server (Python/FastAPI)
Run from `Server/`. There is no `requirements.txt` in the repo — install what `main.py` imports
(`uvicorn[standard]`, not bare `uvicorn`, or the WebSocket route has no protocol implementation to
run on):
```bash
pip install fastapi "uvicorn[standard]" httpx python-dotenv pydantic
uvicorn main:app --reload --port 8000
```
Requires a `.env` file (gitignored) with `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` from the
Discord Developer Portal (Activities → Settings).

There is no test suite or linter configured for the server.

### Client (React/Vite)
Run from `Client/`:
```bash
npm install
npm run dev       # dev server on :5173, proxies /api and /ws to :8000
npm run build
npm run preview
```
Requires a `Client/.env` (gitignored) with `VITE_DISCORD_CLIENT_ID` (same Application ID as the
server's `DISCORD_CLIENT_ID`).

There is no test suite or linter configured for the client.

### Running end-to-end
Discord cannot load `localhost` inside its iframe — it needs a public HTTPS URL. Local development
tunnels the Vite dev server (e.g. `cloudflared tunnel --url http://localhost:5173`) and points the
Activity's Root Mapping (Developer Portal → Activities → Settings → URL Mappings) at the tunnel
domain. The tunnel URL changes on every restart unless a named tunnel is configured, so the Root
Mapping needs re-pasting each time. See `README.md` for the full walkthrough.

## Architecture

### One shared word, one board per player, keyed by Discord's `instanceId`
Everyone who opens the Activity from the same voice channel gets the same `instanceId` from the
Discord SDK. `Server/main.py` uses it as the key into `salas: dict[str, Sala]`. A `Sala` holds one
secret `palabra` for the whole room plus a `jugadores: dict[user_id, Jugador]` map — each `Jugador`
has their own independent `intentos` list, so players race the same word on separate boards rather
than taking turns on one shared board. `conexiones: dict[instance_id, dict[user_id, WebSocket]]`
tracks the live sockets per room. Clicking "nueva partida" calls `Sala.resetear()` +
`Sala.elegir_palabra()`, which fetches a new shared word and clears every player's board, but does
**not** clear `Sala.puntajes` (the session ranking) — that survives across rounds until the server
restarts.

### Identity travels over the WebSocket URL, not a message
The client doesn't send a "join" message. `discordSdk.commands.authenticate()` gives the client a
Discord user id/username/avatar, and `Client/src/App.jsx` puts those directly on the WebSocket URL
as query params (`/ws/{instanceId}?user_id=...&username=...&avatar=...`) before opening the socket.
`Server/main.py`'s `canal_juego` reads them via `websocket.query_params` on connect — there's no
separate handshake message type for this.

### Server sends each player a personalized view, not one broadcast
`Sala.estado_para(id_jugador)` builds a different payload per recipient: the requesting player's
own `Jugador.tablero_propio()` (full guesses, with letters) plus every player's
`Jugador.resumen_publico()` (only the per-guess color arrays — `resultados` — never the letters
someone else typed). `difundir_estado()` loops every connected socket in the room and sends each one
its own `estado_para(...)`, so "seeing other players' boards" never leaks the answer through their
guesses. The secret `palabra` itself is only ever included in *your own* payload, and only once
*your own* `Jugador.finalizado` is true.

### All game state lives in server memory
No database. Restarting the server drops every room (`salas`), every board, and the session
ranking (`Sala.puntajes`). This is a deliberate simplification for a small-group casual game, not
an oversight — see `README.md`'s Notas section.

### Client -> Server auth handshake (Discord OAuth)
`Client/src/App.jsx`'s `conectar()` effect on mount runs the full Discord embedded-app flow in
order: `discordSdk.ready()` → `discordSdk.commands.authorize()` (gets an OAuth `code` in the
iframe) → POST `/api/token` (server exchanges `code` for an `access_token` using the client secret,
which must never reach the browser) → `discordSdk.commands.authenticate()` → open the game
WebSocket at `/ws/{instanceId}?user_id=...`. All four steps must stay in this order; skipping or
reordering breaks the handshake Discord expects from embedded apps.

### Three WebSocket message types, one direction each
Clients only ever send `{"tipo": "intento", "palabra": ...}` or `{"tipo": "nueva_partida"}`. The
server sends three: `"estado"` (the personalized snapshot above, sent after every state change),
`"evento"` (a fire-and-forget "someone just solved it" notification with `nombre`/`avatar`, used to
pop a toast and isn't part of the persisted state), and `"error"` (guess rejected — currently only
for "not a real word"). `Client/src/App.jsx`'s `ws.onmessage` switches on `mensaje.tipo` to route to
the right `setState` call.

### Guess validation is a curated fallback list plus a much larger dictionary
`Server/palabra_random.py` fetches the round's secret word from
`https://random-word-api.herokuapp.com/word?lang=es&length=5` (that API is unreliable — it can
return non-Spanish or malformed entries), validates the response against `Server/palabras.py`'s
`PALABRAS_VALIDAS` set, retries a few times, and falls back to the small curated
`PALABRAS_FALLBACK` list if the API never returns anything usable. `PALABRAS_VALIDAS` is loaded at
import time from `Server/diccionario_5.txt` (~10.8k normalized 5-letter Spanish words, filtered from
github.com/words/an-array-of-spanish-words) and is also what rejects a player's guess in
`canal_juego` if it isn't a real word — regenerate that file rather than hand-editing it if the
dictionary ever needs to change.

### Guess scoring algorithm
`Server/juego.py` implements the standard two-pass Wordle comparison (`calcular_resultado`) to
correctly handle repeated letters: first pass marks exact-position matches and removes them from
both letter pools, second pass marks remaining letters that exist elsewhere in the answer.
`normalizar()` strips accents and uppercases input before comparison (but leaves `Ñ` alone) — this
is the same shape check applied to guesses, to the API's random word, and to entries when building
`diccionario_5.txt`, so all three stay comparable.

### Session ranking is points-per-solve, not win/loss
`Sala.registrar_punto()` awards `MAX_INTENTOS - len(intentos) + 1` points the moment a player's
guess matches the secret word — fewer guesses used means more points — and increments their
`victorias` counter. `Sala.ranking()` sorts by total points, then victorias, both descending. This
is recomputed by `Sala.puntajes`, not stored per-round, so it naturally accumulates across
`nueva_partida` resets within the same `instanceId`.

### Client render logic is state-driven, not event-driven
`Client/src/Tablero.jsx`, `Client/src/OtrosJugadores.jsx`, and `Client/src/Ranking.jsx` are pure
presentational components computed entirely from the latest `"estado"` message (plus
locally-buffered `intentoActual` text that hasn't been submitted yet). `Client/src/Teclado.jsx`
derives per-letter keyboard coloring by scanning every past guess in *your own* board and keeping
the highest-priority result seen (`ausente < presente < correcto`) — recomputed on every render, not
stored in state. Physical keyboard input is wired centrally in `App.jsx` via a `window` `keydown`
listener (letters, Enter, Backspace) rather than inside `Teclado.jsx`, which only handles clicks on
its own buttons. `Client/src/Confeti.jsx` is a dependency-free canvas particle animation triggered
by watching `estado.propio.gano` flip from `false` to `true` (via a ref, so it fires once per win,
not on every re-render).
