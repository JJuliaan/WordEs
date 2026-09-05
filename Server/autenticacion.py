"""Intercambio del "code" de Discord por un access_token.

Discord exige que este paso lo haga un servidor (nunca el navegador), porque
necesita el client_secret.
"""

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter()

URL_TOKEN_DISCORD = "https://discord.com/api/oauth2/token"


class CodigoOAuth(BaseModel):
    code: str


@router.post("/api/token")
async def intercambiar_token(datos: CodigoOAuth):
    async with httpx.AsyncClient() as cliente:
        respuesta = await cliente.post(
            URL_TOKEN_DISCORD,
            data={
                "client_id": settings.discord_client_id,
                "client_secret": settings.discord_client_secret,
                "grant_type": "authorization_code",
                "code": datos.code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    datos_token = respuesta.json()
    return {"access_token": datos_token.get("access_token")}
