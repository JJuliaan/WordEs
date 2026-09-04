"""
Servidor de la Activity de Discord.

Tiene dos trabajos:
1. /api/token — intercambia el "code" que da el SDK de Discord por un
   access_token (esto lo pide Discord por seguridad: el client_secret
   nunca puede viajar al navegador, así que este paso lo hace el servidor).
2. /ws/{instance_id} — un WebSocket por jugador. Todos los jugadores que
   entran a la misma Activity (mismo instance_id) comparten la misma sala:
   juegan la misma palabra secreta y ven el ranking de la sesión, pero cada
   uno tiene su propio tablero (sus propios intentos). De los tableros
   ajenos sólo se ven los colores (verde/amarillo/gris), nunca las letras.
"""

import json
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from juego import calcular_resultado, normalizar
from palabra_random import obtener_palabra_random
from palabras import palabra_valida

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


class Jugador:
    def __init__(self, id: str, nombre: str, avatar: str | None):
        self.id = id
        self.nombre = nombre
        self.avatar = avatar
        self.intentos: list[dict] = []
        self.gano = False

    @property
    def restantes(self) -> int:
        return MAX_INTENTOS - len(self.intentos)

    @property
    def finalizado(self) -> bool:
        return self.gano or self.restantes <= 0

    def resumen_publico(self) -> dict:
        """Lo que ven LOS DEMÁS jugadores: sólo los colores, nunca las letras."""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "avatar": self.avatar,
            "resultados": [intento["resultado"] for intento in self.intentos],
            "gano": self.gano,
            "finalizado": self.finalizado,
        }

    def tablero_propio(self) -> dict:
        """Lo que ve el propio jugador: sus intentos completos, con letras."""
        return {
            "intentos": self.intentos,
            "gano": self.gano,
            "finalizado": self.finalizado,
            "restantes": self.restantes,
        }


class Sala:
    def __init__(self):
        self.palabra: str | None = None
        self.cargando = False
        self.jugadores: dict[str, Jugador] = {}
        # Ranking acumulado de la sesión completa (sobrevive a "nueva partida").
        self.puntajes: dict[str, dict] = {}

    def resetear(self):
        """Limpia los tableros y marca la sala como 'buscando palabra'. Síncrono
        a propósito: se llama justo antes de pedir la palabra nueva (que sí es
        async y puede tardar), para poder avisarle al cliente de inmediato."""
        self.cargando = True
        self.palabra = None
        for jugador in self.jugadores.values():
            jugador.intentos = []
            jugador.gano = False

    async def elegir_palabra(self):
        self.palabra = await obtener_palabra_random()
        self.cargando = False

    def registrar_punto(self, jugador: Jugador):
        entrada = self.puntajes.setdefault(
            jugador.id,
            {"id": jugador.id, "nombre": jugador.nombre, "avatar": jugador.avatar, "puntos": 0, "victorias": 0},
        )
        entrada["nombre"] = jugador.nombre
        entrada["avatar"] = jugador.avatar
        entrada["puntos"] += MAX_INTENTOS - len(jugador.intentos) + 1
        entrada["victorias"] += 1

    def ranking(self) -> list[dict]:
        filas = list(self.puntajes.values())
        filas.sort(key=lambda fila: (-fila["puntos"], -fila["victorias"]))
        return filas

    def estado_para(self, id_jugador: str) -> dict:
        jugador = self.jugadores[id_jugador]
        return {
            "tipo": "estado",
            "cargando": self.cargando,
            "propio": jugador.tablero_propio(),
            "jugadores": [j.resumen_publico() for j in self.jugadores.values()],
            "ranking": self.ranking(),
            "maxIntentos": MAX_INTENTOS,
            # La palabra sólo se revela a un jugador cuando SU PROPIO tablero terminó.
            "palabra": self.palabra if jugador.finalizado else None,
        }


# instance_id de Discord -> Sala de esa Activity
salas: dict[str, Sala] = {}
# instance_id -> {user_id: websocket} de esa sala
conexiones: dict[str, dict[str, WebSocket]] = {}


async def difundir_estado(instance_id: str):
    """Manda a cada jugador conectado SU vista personalizada del estado."""
    sala = salas.get(instance_id)
    if not sala:
        return
    for user_id, ws in conexiones.get(instance_id, {}).items():
        if user_id not in sala.jugadores:
            continue
        await ws.send_text(json.dumps(sala.estado_para(user_id)))


async def difundir_evento(instance_id: str, evento: dict):
    """Manda una notificación puntual (ej: alguien ganó) a toda la sala."""
    mensaje = json.dumps({"tipo": "evento", **evento})
    for ws in conexiones.get(instance_id, {}).values():
        await ws.send_text(mensaje)


@app.websocket("/ws/{instance_id}")
async def canal_juego(websocket: WebSocket, instance_id: str):
    await websocket.accept()

    parametros = websocket.query_params
    user_id = parametros.get("user_id")
    nombre = parametros.get("username") or "Jugador"
    avatar = parametros.get("avatar") or None

    if not user_id:
        await websocket.close(code=4000)
        return

    sala = salas.setdefault(instance_id, Sala())

    if user_id in sala.jugadores:
        # Reconexión: refrescamos nombre/avatar por si cambiaron, pero
        # conservamos los intentos que ya tenía en la ronda actual.
        sala.jugadores[user_id].nombre = nombre
        sala.jugadores[user_id].avatar = avatar
    else:
        sala.jugadores[user_id] = Jugador(user_id, nombre, avatar)

    conexiones.setdefault(instance_id, {})[user_id] = websocket

    if sala.palabra is None and not sala.cargando:
        sala.resetear()
        await difundir_estado(instance_id)
        await sala.elegir_palabra()

    await difundir_estado(instance_id)

    try:
        while True:
            crudo = await websocket.receive_text()
            mensaje = json.loads(crudo)
            jugador = sala.jugadores[user_id]

            if mensaje["tipo"] == "nueva_partida":
                sala.resetear()
                await difundir_estado(instance_id)
                await sala.elegir_palabra()
                await difundir_estado(instance_id)
                continue

            if mensaje["tipo"] == "intento" and not sala.cargando and sala.palabra and not jugador.finalizado:
                intento = normalizar(mensaje["palabra"])
                if len(intento) != 5 or not intento.isalpha():
                    continue
                if any(i["palabra"] == intento for i in jugador.intentos):
                    continue
                if not palabra_valida(intento):
                    await websocket.send_text(
                        json.dumps({"tipo": "error", "mensaje": "Esa palabra no existe en el diccionario."})
                    )
                    continue

                resultado = calcular_resultado(intento, sala.palabra)
                jugador.intentos.append({"palabra": intento, "resultado": resultado})

                if intento == sala.palabra:
                    jugador.gano = True
                    sala.registrar_punto(jugador)
                    await difundir_evento(
                        instance_id, {"nombre": jugador.nombre, "avatar": jugador.avatar}
                    )

                await difundir_estado(instance_id)

    except WebSocketDisconnect:
        conexiones.get(instance_id, {}).pop(user_id, None)
