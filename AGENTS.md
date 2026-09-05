# AGENTS.md

## Project

WordEs is a Spanish Wordle clone delivered as a Discord Activity. It has two parts:

- `Server/`: FastAPI server with game rules, room state, OAuth token exchange, and WebSockets.
- `Client/`: React + Vite iframe UI loaded by Discord.

The directory names are case-sensitive in commands and imports: use `Server/` and `Client/`.

## Development Commands

Server, from `Server/`:

```bash
pip install fastapi "uvicorn[standard]" httpx python-dotenv pydantic
uvicorn main:app --reload --port 8000
```

Client, from `Client/`:

```bash
npm install
npm run dev
npm run build
npm run preview
```

There is currently no configured test suite or linter. Run `npm run build` after client changes. For server changes, start the application or run a focused Python check when possible.

## Important Invariants

- The server owns all authoritative game state. The client must not implement competing game rules.
- Rooms are keyed by Discord `instanceId`; each room has one shared secret word and one independent board per player.
- WebSocket identity is supplied in the connection query parameters. Do not add a separate join message without updating both sides.
- Server state sent to each client is personalized. Other players' guesses must expose only their result colors, never their guessed letters.
- Keep the Discord embedded-app handshake order: `ready()` -> `authorize()` -> `/api/token` -> `authenticate()` -> WebSocket connection.
- The OAuth client secret must remain on the server and must never be sent to the browser.
- Preserve the two-pass Wordle scoring behavior in `Server/juego.py`, including repeated-letter handling and accent normalization.
- `Server/diccionario_5.txt` is generated dictionary data. Regenerate it through the intended process rather than hand-editing individual entries.
- Game state and session rankings are intentionally in memory and reset when the server restarts.

## Change Guidance

- Prefer existing patterns and keep changes focused on the owning module.
- When changing a WebSocket message or payload, update the server and all affected client consumers together.
- Avoid exposing the secret word before the current player has finished their own round.
- Keep credentials in ignored `.env` files: `Server/.env` contains server Discord credentials and `Client/.env` contains `VITE_DISCORD_CLIENT_ID`.
- For Discord iframe end-to-end testing, expose the Vite server through a public HTTPS tunnel and update the Activity URL mapping.
- Do not commit generated dependencies, local environment files, secrets, or unrelated formatting changes.

See `CLAUDE.md` and `README.md` for the fuller architecture and setup walkthrough.
