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
Run from `Server/`:
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Requires a `.env` file (gitignored, copy `Server/.env.example`) with at least `DISCORD_CLIENT_ID`
and `DISCORD_CLIENT_SECRET` from the Discord Developer Portal (Activities → Settings). Every other
value in `.env.example` (game rules, scoring, CORS, the random-word API) is optional and falls back
to the default baked into `config.py` — see "Configuration lives in one place per side" below.

There is no test suite or linter configured for the server.

### Client (React/Vite)
Run from `Client/`:
```bash
npm install
npm run dev       # dev server on :5173, proxies /api and /ws to :8000
npm run build
npm run preview
```
Requires a `Client/.env` (gitignored, copy `Client/.env.example`) with `VITE_DISCORD_CLIENT_ID`
(same Application ID as the server's `DISCORD_CLIENT_ID`).

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
Discord SDK. `Server/websocket_juego.py` uses it as the key into `salas: dict[str, Sala]` (the
`Sala` class itself lives in `Server/sala.py`, `Jugador` in `Server/jugador.py`). A `Sala` holds one
secret `palabra` for the whole room plus a `jugadores: dict[user_id, Jugador]` map — each `Jugador`
has their own independent `intentos` list, so players race the same word on separate boards rather
than taking turns on one shared board. `conexiones: dict[instance_id, dict[user_id, WebSocket]]`
(also in `websocket_juego.py`) tracks the live sockets per room. Clicking "nueva partida" calls
`Sala.resetear()` + `Sala.elegir_palabra()`, which fetches a new shared word and clears every
player's board, but does **not** clear `Sala.puntajes` (the session ranking) — that survives across
rounds until the server restarts.

### Identity travels over the WebSocket URL, not a message
The client doesn't send a "join" message. `discordSdk.commands.authenticate()` gives the client a
Discord user id/username/avatar, and `Client/src/services/gameSocket.js`'s `conectarGameSocket`
puts those directly on the WebSocket URL as query params
(`/ws/{instanceId}?user_id=...&username=...&avatar=...`) before opening the socket.
`Server/websocket_juego.py`'s `canal_juego` reads them via `websocket.query_params` on connect —
there's no separate handshake message type for this.

### Server sends each player a personalized view, not one broadcast
`Sala.estado_para(id_jugador)` builds a different payload per recipient: the requesting player's
own `Jugador.tablero_propio()` (full guesses, with letters) plus every player's
`Jugador.resumen_publico()` (only the per-guess color arrays — `resultados` — never the letters
someone else typed). `difundir_estado()` (in `Server/websocket_juego.py`) loops every connected
socket in the room and sends each one its own `estado_para(...)`, so "seeing other players' boards"
never leaks the answer through their guesses. The secret `palabra` itself is only ever included in
*your own* payload, and only once *your own* `Jugador.finalizado` is true.

### All game state lives in server memory
No database. Restarting the server drops every room (`salas`), every board, and the session
ranking (`Sala.puntajes`). This is a deliberate simplification for a small-group casual game, not
an oversight — see `README.md`'s Notas section.

### Configuration lives in one place per side ("protected variations")
`Server/config.py` is the *only* module allowed to read environment variables: it defines a
pydantic-settings `Settings` class (backed by `Server/.env`, see `.env.example` for every key) and
exports a single `settings` instance. Every other server module imports `from config import
settings` rather than calling `os.getenv`/`load_dotenv` itself — game rules (`max_intentos`,
`max_pistas`, `longitud_palabra`), every scoring constant, CORS, and the random-word API's
URL/retries/timeout all live there with sane defaults, so `.env` only needs to override what
actually differs per deployment. On the client, true environment values (`VITE_DISCORD_CLIENT_ID`)
go through `Client/.env` + `Client/src/config/discord.js`; UI-tuning constants that aren't gameplay
rules (toast durations, confetti physics, keyboard layout, theme storage key) are centralized in
`Client/src/config/constantes.js` instead of being scattered as local consts per component. Actual
gameplay numbers (word length, max attempts/hints, next hint's cost) are *not* duplicated into the
client at all — they ride along in the WebSocket `"estado"` payload (`longitudPalabra`,
`maxIntentos`, `maxPistas`, `propio.costoProximaPista`) so the server stays the single source of
truth and the two sides can't drift out of sync.

### Client -> Server auth handshake (Discord OAuth)
`Client/src/services/discordAuth.js`'s `autenticarConDiscord()` runs the full Discord embedded-app
flow in order: `discordSdk.ready()` → `discordSdk.commands.authorize()` (gets an OAuth `code` in the
iframe) → POST `/api/token` (handled by `Server/autenticacion.py`, which exchanges `code` for an
`access_token` using the client secret, which must never reach the browser) →
`discordSdk.commands.authenticate()`. `Client/src/hooks/useConexionJuego.js` calls that function on
mount, then opens the game WebSocket (`Client/src/services/gameSocket.js`'s `conectarGameSocket`)
at `/ws/{instanceId}?user_id=...`. All four auth steps must stay in this order; skipping or
reordering breaks the handshake Discord expects from embedded apps.

### WebSocket message types, one direction each
Clients send three: `{"tipo": "intento", "palabra": ...}`, `{"tipo": "nueva_partida"}`, and
`{"tipo": "pista"}` (spend a hint), all handled in `Server/websocket_juego.py`'s `canal_juego`. The
server sends four: `"estado"` (the personalized snapshot above, sent after every state change),
`"evento"` (a fire-and-forget "someone just solved it" notification with `nombre`/`avatar`, used to
pop a toast and isn't part of the persisted state), `"error"` (a guess/hint request rejected — not a
real word, out of hints, or no positions left to reveal), and `"resumen_ronda"` (sent once, directly
to the player whose round just ended, carrying the `puntaje.calcular_desglose_ronda` breakdown — see
"Session ranking" below). `Client/src/hooks/useConexionJuego.js`'s `onMensaje` callback switches on
`mensaje.tipo` to route to the right `setState` call.

### Guess validation is a curated fallback list plus a much larger dictionary
`Server/palabra_random.py` fetches the round's secret word from `settings.random_word_api_url`
(default `random-word-api.herokuapp.com`, word length from `settings.longitud_palabra` — that API is
unreliable — it can return non-Spanish or malformed entries), validates the response against
`Server/palabras.py`'s `PALABRAS_VALIDAS` set, retries `settings.random_word_api_intentos` times,
and falls back to the small curated `PALABRAS_FALLBACK` list if the API never returns anything
usable. `PALABRAS_VALIDAS` is loaded at import time from `Server/diccionario_5.txt` (~10.8k
normalized 5-letter Spanish words, filtered from github.com/words/an-array-of-spanish-words) and is
also what rejects a player's guess in `Server/websocket_juego.py`'s `canal_juego` if it isn't a real
word — regenerate that file rather than hand-editing it if the dictionary ever needs to change.

### Guess scoring algorithm
`Server/juego.py` implements the standard two-pass Wordle comparison (`calcular_resultado`) to
correctly handle repeated letters: first pass marks exact-position matches and removes them from
both letter pools, second pass marks remaining letters that exist elsewhere in the answer.
`normalizar()` strips accents and uppercases input before comparison (but leaves `Ñ` alone) — this
is the same shape check applied to guesses, to the API's random word, and to entries when building
`diccionario_5.txt`, so all three stay comparable.

### Scoring is computed once per round, from the full guess history, with dedup
`Server/puntaje.py`'s `calcular_desglose_ronda(intentos, gano, restantes, pistas_usadas)` is the
only place points are calculated (`Jugador.calcular_puntaje_ronda()` in `jugador.py` just forwards
to it). It's called once per player, exactly when their round ends (win or out of attempts), from
`Sala.finalizar_jugador()` in `sala.py`. The rules, all deliberately deduplicated across the whole
attempt history rather than summed per-attempt:
- **Green points** (`settings.puntos_por_verde`, default 10): one per distinct *board position*
  that has ever come back `"correcto"`, no matter how many attempts also landed on it — repeating an
  already-confirmed letter doesn't add more points.
- **Yellow points** (`settings.puntos_por_amarillo`, default 5): one per distinct *letter* that has
  ever come back `"presente"`, minus any letter that has *also* come back `"correcto"` at some
  position — confirming a letter's position retroactively cancels its earlier yellow credit instead
  of stacking with it.
- **Win bonus** (`settings.bonus_victoria`, default 20) and **leftover-attempts bonus**
  (`restantes * settings.puntos_por_intento_sobrante`, default 5/attempt) only apply if `gano`.
- **Hint cost** (`puntaje.costo_total_pistas`, triangular: `settings.costo_base_pista` ×1, ×2, ×3…)
  is subtracted; the total floors at 0.

`Sala.finalizar_jugador()` folds that round's `total` into `Sala.puntajes[jugador.id]` (accumulating
`puntos`, `rondasJugadas`, `mejorRonda`, and `victorias`), which is *not* stored per-round, so it
naturally survives `nueva_partida` resets within the same `instanceId` until the server restarts.
`Sala.ranking()` sorts that dict by total points, then victorias, both descending.

### Client render logic is state-driven, not event-driven
`Client/src/components/Tablero.jsx`, `OtrosJugadores.jsx`, and `Ranking.jsx` are pure presentational
components computed entirely from the latest `"estado"` message (plus the locally-buffered
`intentoActual` text from the `useIntentoActual` hook that hasn't been submitted yet — including the
word length, which comes from `estado.longitudPalabra`, not a hardcoded 5).
`components/Teclado.jsx` derives per-letter keyboard coloring by scanning every past guess in *your
own* board and keeping the highest-priority result seen (`ausente < presente < correcto`, from
`config/constantes.js`'s `PRIORIDAD_TECLA`) — recomputed on every render, not stored in state.
Physical keyboard input is wired via `hooks/useTecladoFisico.js`'s `window` `keydown` listener
(letters, Enter, Backspace) rather than inside `Teclado.jsx`, which only handles clicks on its own
buttons. `components/Confeti.jsx` is a dependency-free canvas particle animation; the win-detection
that triggers it (watching `estado.propio.gano` flip from `false` to `true` via a ref, so it fires
once per win, not on every re-render) lives separately in `hooks/useConfetiVictoria.js`.
