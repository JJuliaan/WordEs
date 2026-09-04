"""Elige la palabra secreta de cada ronda pidiéndosela a una API externa."""

import random

import httpx

from juego import normalizar
from palabras import PALABRAS_FALLBACK, palabra_valida

URL_API = "https://random-word-api.herokuapp.com/word"
INTENTOS_API = 5


async def obtener_palabra_random() -> str:
    """Pide una palabra de 5 letras a random-word-api.

    La API a veces devuelve basura (palabras de otro idioma, nombres propios,
    etc.), así que la validamos contra nuestro diccionario y reintentamos unas
    pocas veces. Si la API no responde o nunca da algo válido, usamos la lista
    de respaldo local para que la partida pueda arrancar igual.
    """
    async with httpx.AsyncClient(timeout=5) as cliente:
        for _ in range(INTENTOS_API):
            try:
                respuesta = await cliente.get(URL_API, params={"lang": "es", "length": 5})
                respuesta.raise_for_status()
                candidatos = respuesta.json()
            except (httpx.HTTPError, ValueError):
                continue

            if not candidatos:
                continue

            palabra = normalizar(candidatos[0])
            if len(palabra) == 5 and palabra.isalpha() and palabra_valida(palabra):
                return palabra

    return random.choice(PALABRAS_FALLBACK)
