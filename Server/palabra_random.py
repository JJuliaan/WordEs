"""Elige la palabra secreta de cada ronda pidiéndosela a una API externa."""

import random

import httpx

from config import settings
from juego import normalizar
from palabras import PALABRAS_FALLBACK, palabra_valida


async def obtener_palabra_random() -> str:
    """Pide una palabra de `settings.longitud_palabra` letras a la API externa.

    La API a veces devuelve basura (palabras de otro idioma, nombres propios,
    etc.), así que la validamos contra nuestro diccionario y reintentamos unas
    pocas veces. Si la API no responde o nunca da algo válido, usamos la lista
    de respaldo local para que la partida pueda arrancar igual.
    """
    async with httpx.AsyncClient(timeout=settings.random_word_api_timeout) as cliente:
        for _ in range(settings.random_word_api_intentos):
            try:
                respuesta = await cliente.get(
                    settings.random_word_api_url,
                    params={"lang": "es", "length": settings.longitud_palabra},
                )
                respuesta.raise_for_status()
                candidatos = respuesta.json()
            except (httpx.HTTPError, ValueError):
                continue

            if not candidatos:
                continue

            palabra = normalizar(candidatos[0])
            if len(palabra) == settings.longitud_palabra and palabra.isalpha() and palabra_valida(palabra):
                return palabra

    return random.choice(PALABRAS_FALLBACK)
