"""Una sala = una Activity de Discord (un instance_id): palabra compartida,
un tablero por jugador, y el ranking acumulado de la sesión."""

from config import settings
from jugador import Jugador
from palabra_random import obtener_palabra_random


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
            jugador.pistas_usadas = 0
            jugador.posiciones_pista = set()

    async def elegir_palabra(self):
        self.palabra = await obtener_palabra_random()
        self.cargando = False

    def finalizar_jugador(self, jugador: Jugador) -> dict:
        """Cierra la ronda para este jugador (ganó o se quedó sin intentos) y
        suma el puntaje de la ronda al ranking acumulado de la sesión."""
        desglose = jugador.calcular_puntaje_ronda()
        entrada = self.puntajes.setdefault(
            jugador.id,
            {
                "id": jugador.id,
                "nombre": jugador.nombre,
                "avatar": jugador.avatar,
                "puntos": 0,
                "victorias": 0,
                "rondasJugadas": 0,
                "mejorRonda": 0,
            },
        )
        entrada["nombre"] = jugador.nombre
        entrada["avatar"] = jugador.avatar
        entrada["puntos"] += desglose["total"]
        entrada["rondasJugadas"] += 1
        entrada["mejorRonda"] = max(entrada["mejorRonda"], desglose["total"])
        if jugador.gano:
            entrada["victorias"] += 1
        return desglose

    def ranking(self) -> list[dict]:
        filas = list(self.puntajes.values())
        filas.sort(key=lambda fila: (-fila["puntos"], -fila["victorias"]))
        return filas

    def estado_para(self, id_jugador: str) -> dict:
        jugador = self.jugadores[id_jugador]
        return {
            "tipo": "estado",
            "cargando": self.cargando,
            # Ojo: acá SIEMPRE pasamos self.palabra, a diferencia del campo
            # "palabra" de más abajo. tablero_propio() sólo la usa para
            # revelar las posiciones que el jugador ya pagó con una pista
            # (self.posiciones_pista), nunca la palabra completa.
            "propio": jugador.tablero_propio(self.palabra),
            "jugadores": [j.resumen_publico() for j in self.jugadores.values()],
            "ranking": self.ranking(),
            "maxIntentos": settings.max_intentos,
            "maxPistas": settings.max_pistas,
            "longitudPalabra": settings.longitud_palabra,
            # La palabra sólo se revela a un jugador cuando SU PROPIO tablero terminó.
            "palabra": self.palabra if jugador.finalizado else None,
        }
