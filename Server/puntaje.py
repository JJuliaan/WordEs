"""Cálculo del puntaje de una ronda a partir del historial de intentos.

Reglas (acumuladas sobre TODOS los intentos de la ronda, ganada o no):
- Cada POSICIÓN del tablero que en algún momento salió "correcto" vale
  `puntos_por_verde`, una sola vez, sin importar en cuántos intentos distintos
  volvió a salir correcta esa misma posición (repetir una letra ya confirmada
  no debe seguir sumando).
- Cada LETRA que en algún momento salió "presente" vale `puntos_por_amarillo`,
  una sola vez — pero sólo si esa letra nunca llegó a estar "correcto" en
  ninguna posición. Si una letra fue amarilla y más tarde se acierta su
  posición, la amarilla se anula: sólo cuenta la verde.
"""

from config import settings


def costo_pista_individual(numero_pista: int) -> int:
    """Costo de la n-ésima pista pedida (1-indexado): base, 2×base, 3×base..."""
    return settings.costo_base_pista * numero_pista


def costo_total_pistas(pistas_usadas: int) -> int:
    return sum(costo_pista_individual(i + 1) for i in range(pistas_usadas))


def calcular_desglose_ronda(
    intentos: list[dict], gano: bool, restantes: int, pistas_usadas: int
) -> dict:
    """Desglose completo de puntos de la ronda para un jugador. Se calcula una
    sola vez, cuando su tablero queda finalizado (ganó o se quedó sin
    intentos) — ver `Sala.finalizar_jugador`."""
    posiciones_correctas: set[int] = set()
    letras_confirmadas: set[str] = set()
    letras_presentes: set[str] = set()

    for intento in intentos:
        palabra = intento["palabra"]
        for i, color in enumerate(intento["resultado"]):
            letra = palabra[i]
            if color == "correcto":
                posiciones_correctas.add(i)
                letras_confirmadas.add(letra)
            elif color == "presente":
                letras_presentes.add(letra)

    letras_amarillas = letras_presentes - letras_confirmadas

    verdes = len(posiciones_correctas)
    amarillos = len(letras_amarillas)
    puntos_verdes = verdes * settings.puntos_por_verde
    puntos_amarillos = amarillos * settings.puntos_por_amarillo

    bonus_victoria = 0
    bonus_intentos = 0
    if gano:
        bonus_victoria = settings.bonus_victoria
        bonus_intentos = restantes * settings.puntos_por_intento_sobrante

    costo_pistas = costo_total_pistas(pistas_usadas)

    total = max(0, puntos_verdes + puntos_amarillos + bonus_victoria + bonus_intentos - costo_pistas)

    return {
        "verdes": verdes,
        "amarillos": amarillos,
        "puntosVerdes": puntos_verdes,
        "puntosAmarillos": puntos_amarillos,
        "puntosLetras": puntos_verdes + puntos_amarillos,
        "bonusVictoria": bonus_victoria,
        "bonusIntentos": bonus_intentos,
        "pistasUsadas": pistas_usadas,
        "costoPistas": costo_pistas,
        "total": total,
    }
