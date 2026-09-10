"""Canal en tiempo real del juego: un WebSocket por jugador, agrupados por
instance_id de Discord (todos los que están en la misma Activity comparten
sala). La identidad viaja en la query string de la conexión (no hay mensaje
de "join" aparte) — ver `canal_juego`."""

import json
import random

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings
from jugador import Jugador
from juego import calcular_resultado, normalizar
from palabras import palabra_valida
from sala import Sala

router = APIRouter()

# instance_id de Discord -> Sala de esa Activity
salas: dict[str, Sala] = {}
# instance_id -> {user_id: websocket} de esa sala
conexiones: dict[str, dict[str, WebSocket]] = {}


async def difundir_estado(instance_id: str):
    """Manda a cada jugador conectado SU vista personalizada del estado.

    Importante: si un socket ya está muerto (el jugador se fue justo en este
    momento, antes de que el bucle principal pudiera detectarlo), no dejamos
    que eso frene la difusión al resto ni interrumpa lo que venga después
    (por ejemplo, elegir_palabra() en canal_juego) — lo sacamos de
    `conexiones` y seguimos.
    """
    sala = salas.get(instance_id)
    if not sala:
        return

    conexiones_sala = conexiones.get(instance_id, {})
    desconectados = []

    for user_id, ws in list(conexiones_sala.items()):
        if user_id not in sala.jugadores:
            continue
        try:
            await ws.send_text(json.dumps(sala.estado_para(user_id)))
        except Exception:
            desconectados.append(user_id)

    for user_id in desconectados:
        conexiones_sala.pop(user_id, None)


async def difundir_evento(instance_id: str, evento: dict):
    """Manda una notificación puntual (ej: alguien ganó) a toda la sala.
    Mismo criterio que difundir_estado: un socket muerto no frena al resto."""
    mensaje = json.dumps({"tipo": "evento", **evento})
    conexiones_sala = conexiones.get(instance_id, {})
    desconectados = []

    for user_id, ws in list(conexiones_sala.items()):
        try:
            await ws.send_text(mensaje)
        except Exception:
            desconectados.append(user_id)

    for user_id in desconectados:
        conexiones_sala.pop(user_id, None)


async def _manejar_nueva_partida(sala: Sala, instance_id: str):
    sala.resetear()
    await difundir_estado(instance_id)
    await sala.elegir_palabra()
    await difundir_estado(instance_id)


async def _manejar_pista(sala: Sala, jugador: Jugador, websocket: WebSocket, instance_id: str):
    if jugador.pistas_usadas >= settings.max_pistas:
        await websocket.send_text(json.dumps({"tipo": "error", "mensaje": "Ya usaste el máximo de pistas."}))
        return

    reveladas = jugador.posiciones_reveladas()
    disponibles = [i for i in range(len(sala.palabra)) if i not in reveladas]
    if not disponibles:
        await websocket.send_text(json.dumps({"tipo": "error", "mensaje": "Ya conocés todas las posiciones."}))
        return

    posicion = random.choice(disponibles)
    jugador.posiciones_pista.add(posicion)
    jugador.pistas_usadas += 1

    # No hace falta un mensaje aparte: el próximo "estado" ya trae la pista
    # nueva en propio.pistas.
    await difundir_estado(instance_id)


async def _manejar_intento(sala: Sala, jugador: Jugador, websocket: WebSocket, instance_id: str, palabra_cruda: str):
    intento = normalizar(palabra_cruda)
    if len(intento) != settings.longitud_palabra or not intento.isalpha():
        return
    if any(i["palabra"] == intento for i in jugador.intentos):
        return
    if not palabra_valida(intento):
        await websocket.send_text(
            json.dumps({"tipo": "error", "mensaje": "Esa palabra no existe en el diccionario."})
        )
        return

    resultado = calcular_resultado(intento, sala.palabra)
    jugador.intentos.append({"palabra": intento, "resultado": resultado})

    gano_esta_vez = intento == sala.palabra
    if gano_esta_vez:
        jugador.gano = True

    desglose = None
    if jugador.finalizado:
        desglose = sala.finalizar_jugador(jugador)

    if gano_esta_vez:
        await difundir_evento(instance_id, {"nombre": jugador.nombre, "avatar": jugador.avatar})

    await difundir_estado(instance_id)

    if desglose is not None:
        await websocket.send_text(json.dumps({"tipo": "resumen_ronda", "desglose": desglose}))


@router.websocket("/ws/{instance_id}")
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

    # Todo lo que sigue queda bajo un try/finally: si la conexión se corta
    # en CUALQUIER punto de acá abajo (no solo dentro del while de mensajes),
    # el finally garantiza que este jugador se saque de `conexiones`. Antes,
    # una desconexión temprana (antes de llegar al while) dejaba a la sala
    # trabada en `cargando = True` para siempre, porque elegir_palabra()
    # nunca llegaba a ejecutarse.
    try:
        if sala.palabra is None and not sala.cargando:
            sala.resetear()
            await difundir_estado(instance_id)
            await sala.elegir_palabra()

        await difundir_estado(instance_id)

        while True:
            crudo = await websocket.receive_text()
            mensaje = json.loads(crudo)
            jugador = sala.jugadores[user_id]
            tipo = mensaje["tipo"]

            if tipo == "nueva_partida":
                await _manejar_nueva_partida(sala, instance_id)
            elif tipo == "pista" and not sala.cargando and sala.palabra and not jugador.finalizado:
                await _manejar_pista(sala, jugador, websocket, instance_id)
            elif tipo == "intento" and not sala.cargando and sala.palabra and not jugador.finalizado:
                await _manejar_intento(sala, jugador, websocket, instance_id, mensaje["palabra"])

    except WebSocketDisconnect:
        pass
    finally:
        conexiones.get(instance_id, {}).pop(user_id, None)
