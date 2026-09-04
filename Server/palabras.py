"""Palabras de respaldo (por si la API externa falla) y diccionario de validación.

`PALABRAS_FALLBACK` es la lista curada que antes se usaba como única fuente de
palabras; ahora sólo se usa si `random-word-api` no responde. `PALABRAS_VALIDAS`
es un diccionario mucho más amplio (~10800 palabras de 5 letras, sacado de
https://github.com/words/an-array-of-spanish-words) que se usa para rechazar
intentos que no son palabras reales del español.
"""

from pathlib import Path

PALABRAS_FALLBACK = [
    "CARRO", "PERRO", "GATOS", "CIELO", "PLAYA", "NUBES", "FUEGO", "AGUAS",
    "VERDE", "NEGRO", "ROJOS", "LIBRO", "MESAS", "SILLA", "VENTA", "CASAS",
    "NIÑOS", "NIÑAS", "AMIGO", "AMIGA", "FIRME", "TARDE", "NOCHE", "MUNDO",
    "FUERA", "CAMPO", "RATON", "LOBOS", "TIGRE", "LEONA", "VACAS", "TOROS",
    "AVION", "BARCO", "CALLE", "PLAZA", "BAILE", "CANTO", "RISAS", "LLORO",
    "SUEÑO", "DUDAS", "IDEAS", "LIBRE", "FELIZ", "DEBIL", "LENTO", "ALTOS",
    "BAJOS", "VIEJO", "JOVEN", "NUEVO", "SUCIO", "CLARO", "CHICO", "CHICA",
    "NEGAR", "SOÑAR", "VOLAR", "NADAR", "CORRE", "SALTA", "MIRAR", "HABLA",
    "COMER", "BEBER", "ANDAR", "PASAR", "LLEGA", "SALIR", "ABRIR", "PINTA",
    "CANTA", "BAILA", "JUEGA", "JUEGO", "FECHA", "HORAS", "MESES", "NORTE",
    "OESTE", "PLATA", "COBRE", "ARENA", "LAGOS", "MARES", "VIDAS", "SALUD",
    "DOLOR", "ODIOS", "REINA", "REYES", "CONDE", "DUQUE", "PADRE", "MADRE",
    "HIJOS", "HIJAS", "PRIMO", "PRIMA", "NIETO", "NIETA", "YERNO", "NUERA",
    "VIUDA", "VIUDO", "NOVIO", "NOVIA",
]

_RUTA_DICCIONARIO = Path(__file__).parent / "diccionario_5.txt"
PALABRAS_VALIDAS: set[str] = set(_RUTA_DICCIONARIO.read_text(encoding="utf-8").splitlines())
# Por las dudas alguna palabra de respaldo no esté en el diccionario descargado.
PALABRAS_VALIDAS.update(PALABRAS_FALLBACK)


def palabra_valida(palabra: str) -> bool:
    """True si `palabra` (ya normalizada: mayúsculas, sin tildes) existe en el diccionario."""
    return palabra in PALABRAS_VALIDAS
