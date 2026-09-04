"""Reglas del Wordle: normalizar texto y comparar un intento contra la respuesta."""

TABLA_TILDES = str.maketrans("ÁÉÍÓÚáéíóú", "AEIOUaeiou")


def normalizar(palabra: str) -> str:
    return palabra.strip().translate(TABLA_TILDES).upper()


def calcular_resultado(intento: str, respuesta: str) -> list[str]:
    """Algoritmo estándar de Wordle: dos pasadas para manejar letras repetidas."""
    resultado = ["ausente"] * len(intento)
    letras_respuesta = list(respuesta)
    letras_intento = list(intento)

    # Primera pasada: posiciones exactas
    for i in range(len(intento)):
        if letras_intento[i] == letras_respuesta[i]:
            resultado[i] = "correcto"
            letras_respuesta[i] = None
            letras_intento[i] = None

    # Segunda pasada: letra presente pero en otra posición
    for i in range(len(intento)):
        if letras_intento[i] is not None and letras_intento[i] in letras_respuesta:
            resultado[i] = "presente"
            idx = letras_respuesta.index(letras_intento[i])
            letras_respuesta[idx] = None

    return resultado
