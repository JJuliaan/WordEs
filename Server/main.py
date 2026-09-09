"""
Servidor de la Activity de Discord.

Tiene dos trabajos:
1. /api/token (`autenticacion.py`) — intercambia el "code" que da el SDK de
   Discord por un access_token (esto lo pide Discord por seguridad: el
   client_secret nunca puede viajar al navegador, así que este paso lo hace
   el servidor).
2. /ws/{instance_id} (`websocket_juego.py`) — un WebSocket por jugador. Todos
   los jugadores que entran a la misma Activity (mismo instance_id) comparten
   la misma sala: juegan la misma palabra secreta y ven el ranking de la
   sesión, pero cada uno tiene su propio tablero (sus propios intentos). De
   los tableros ajenos sólo se ven los colores (verde/amarillo/gris), nunca
   las letras.

El sistema de puntos (ver `puntaje.calcular_desglose_ronda`) premia letras
verdes/amarillas descubiertas en la ronda (ganada o no, cada una una sola
vez), suma un bonus si adivinás la palabra (más grande cuantos intentos te
sobraron) y resta puntos por cada pista pedida.

Toda la configuración (credenciales de Discord, reglas de la partida, valores
del sistema de puntos) vive en `config.py`, no acá.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from autenticacion import router as router_autenticacion
from config import settings
from websocket_juego import router as router_websocket

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins_lista,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_autenticacion)
app.include_router(router_websocket)


# Esto va AL FINAL, después de los include_router de arriba. En producción
# copiamos el build de React (Client/dist) a Server/static antes de
# desplegar, y este mismo servidor Python lo sirve — así hay un solo
# servicio, un solo dominio, sin líos de CORS entre client y server.
# Como se declara último, /api/token y /ws/... siguen resolviendo ellos
# mismos primero; esto solo atrapa lo que no coincidió con ninguna ruta de
# los routers de arriba. En desarrollo local no existe la carpeta "static"
# (usás `npm run dev` con el proxy de Vite en su lugar), por eso el chequeo
# de os.path.isdir: sin él, el servidor tiraría error al arrancar en local.
if os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
