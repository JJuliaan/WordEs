"""Manda notificaciones a un canal de texto de Discord usando el Bot Token.

Esto es aparte del flujo de autenticación de usuarios (`autenticacion.py`,
que usa el Client ID/Secret): para POSTEAR un mensaje en un canal hace falta
un Bot Token con permiso de "Send Messages" ahí — son dos credenciales
distintas de la misma Application.
"""

import logging

import httpx

from config import settings

API_BASE = "https://discord.com/api/v10"

logger = logging.getLogger("notificaciones")


async def notificar_inicio_partida(channel_id: str | None, nombre: str) -> None:
    """Avisa en el canal de texto que alguien empezó a jugar.

    Si algo falla acá (no hay DISCORD_BOT_TOKEN configurado, el bot no tiene
    permiso en ese canal, Discord está caído, etc.) NO debe romper la
    conexión del jugador — pero sí queda registrado en la consola del
    servidor para poder diagnosticarlo.
    """
    if not channel_id:
        logger.warning("No se mandó notificación: channel_id vacío (¿el cliente no lo está enviando?)")
        return
    if not settings.discord_bot_token:
        logger.warning("No se mandó notificación: falta DISCORD_BOT_TOKEN en .env")
        return

    try:
        async with httpx.AsyncClient() as cliente:
            respuesta = await cliente.post(
                f"{API_BASE}/channels/{channel_id}/messages",
                headers={"Authorization": f"Bot {settings.discord_bot_token}"},
                json={"content": f"🎮 **{nombre}** empezó a jugar Wordle en Español"},
                timeout=5.0,
            )
        if respuesta.status_code >= 400:
            logger.warning(
                "Discord rechazó la notificación (status %s) para channel_id=%s: %s",
                respuesta.status_code,
                channel_id,
                respuesta.text,
            )
        else:
            logger.info("Notificación mandada a channel_id=%s", channel_id)
    except Exception:
        logger.exception("Error de red mandando la notificación a channel_id=%s", channel_id)
