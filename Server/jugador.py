"""Estado y tablero de un jugador dentro de una sala."""

from config import settings
from puntaje import calcular_desglose_ronda, costo_pista_individual


class Jugador:
    def __init__(self, id: str, nombre: str, avatar: str | None):
        self.id = id
        self.nombre = nombre
        self.avatar = avatar
        self.intentos: list[dict] = []
        self.gano = False
        self.pistas_usadas = 0
        self.posiciones_pista: set[int] = set()

    @property
    def restantes(self) -> int:
        return settings.max_intentos - len(self.intentos)

    @property
    def finalizado(self) -> bool:
        return self.gano or self.restantes <= 0

    def posiciones_reveladas(self) -> set[int]:
        """Posiciones que el jugador ya conoce con certeza: por una pista, o
        porque algún intento suyo ya le pegó 'correcto' ahí."""
        posiciones = set(self.posiciones_pista)
        for intento in self.intentos:
            for i, r in enumerate(intento["resultado"]):
                if r == "correcto":
                    posiciones.add(i)
        return posiciones

    def calcular_puntaje_ronda(self) -> dict:
        return calcular_desglose_ronda(self.intentos, self.gano, self.restantes, self.pistas_usadas)

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

    def tablero_propio(self, palabra: str | None) -> dict:
        """Lo que ve el propio jugador: sus intentos completos, con letras."""
        pistas_disponibles = max(0, settings.max_pistas - self.pistas_usadas)
        return {
            "intentos": self.intentos,
            "gano": self.gano,
            "finalizado": self.finalizado,
            "restantes": self.restantes,
            "pistasUsadas": self.pistas_usadas,
            "pistasDisponibles": pistas_disponibles,
            "costoProximaPista": (
                costo_pista_individual(self.pistas_usadas + 1) if pistas_disponibles > 0 else 0
            ),
            "pistas": (
                [{"posicion": i, "letra": palabra[i]} for i in sorted(self.posiciones_pista)]
                if palabra
                else []
            ),
        }
