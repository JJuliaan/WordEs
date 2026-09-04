"""
Servidor de la Activity de Discord.

Tiene dos trabajos:
1. /api/token — intercambia el "code" que da el SDK de Discord por un
   access_token (esto lo pide Discord por seguridad: el client_secret
   nunca puede viajar al navegador, así que este paso lo hace el servidor).
2. /ws/{instance_id} — un WebSocket por partida. Cada jugador que entra a
   la misma Activity (mismo canal de voz/servidor) comparte el mismo
   instance_id, así que basta con reenviar el estado a todos los
   conectados para que el tablero sea compartido en tiempo real.
"""

import json
import os
import random

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from juego import calcular_resultado, normalizar
from palabras import PALABRAS

load_dotenv()

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")

MAX_INTENTOS = 8

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodigoOAuth(BaseModel):
    code: str


@app.post("/api/token")
async def intercambiar_token(datos: CodigoOAuth):
    async with httpx.AsyncClient() as cliente:
        respuesta = await cliente.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": datos.code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    datos_token = respuesta.json()
    return {"access_token": datos_token.get("access_token")}


class Partida:
    def __init__(self):
        self.palabra = random.choice(PALABRAS)
        self.intentos: list[dict] = []
        self.finalizada = False
        self.ganador: str | None = None

    @property
    def restantes(self) -> int:
        return MAX_INTENTOS - len(self.intentos)

    def a_dict(self) -> dict:
        return {
            "intentos": self.intentos,
            "finalizada": self.finalizada,
            "ganador": self.ganador,
            "restantes": self.restantes,
            "maxIntentos": MAX_INTENTOS,
            # Solo mandamos la palabra si ya terminó (si no, sería trampa)
            "palabra": self.palabra if self.finalizada else None,
        }


# instance_id de Discord -> Partida de esa sala
partidas: dict[str, Partida] = {}
# instance_id -> lista de conexiones websocket activas en esa sala
conexiones: dict[str, list[WebSocket]] = {}


async def difundir(instance_id: str):
    """Manda el estado actualizado a todos los jugadores conectados a esta sala."""
    partida = partidas.get(instance_id)
    if not partida:
        return
    mensaje = json.dumps(partida.a_dict())
    for ws in conexiones.get(instance_id, []):
        await ws.send_text(mensaje)


@app.websocket("/ws/{instance_id}")
async def canal_juego(websocket: WebSocket, instance_id: str):
    await websocket.accept()
    conexiones.setdefault(instance_id, []).append(websocket)

    if instance_id not in partidas:
        partidas[instance_id] = Partida()

    # Al conectarse, le mandamos el estado actual solo a ese jugador
    await websocket.send_text(json.dumps(partidas[instance_id].a_dict()))

    try:
        while True:
            crudo = await websocket.receive_text()
            mensaje = json.loads(crudo)
            partida = partidas[instance_id]

            if mensaje["tipo"] == "nueva_partida":
                partidas[instance_id] = Partida()

            elif mensaje["tipo"] == "intento" and not partida.finalizada:
                intento = normalizar(mensaje["palabra"])
                if len(intento) != 5 or not intento.isalpha():
                    continue
                if any(i["palabra"] == intento for i in partida.intentos):
                    continue

                resultado = calcular_resultado(intento, partida.palabra)
                partida.intentos.append(
                    {
                        "palabra": intento,
                        "resultado": resultado,
                        "autor": mensaje.get("autor", "Jugador"),
                    }
                )

                if intento == partida.palabra:
                    partida.finalizada = True
                    partida.ganador = mensaje.get("autor", "Jugador")
                elif partida.restantes <= 0:
                    partida.finalizada = True

            await difundir(instance_id)

    except WebSocketDisconnect:
        conexiones[instance_id].remove(websocket)
