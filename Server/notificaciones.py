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


async def crear_invitacion_actividad(channel_id: str) -> str | None:
    """Crea una invitación especial de Activity (target_type=2,
    EMBEDDED_APPLICATION). Discord renderiza este tipo de invitación con una
    tarjeta propia que incluye el ícono de la app y un botón "Unirse" que
    lanza la Activity directo — no armamos nosotros ese diseño, lo hace
    Discord solo a partir del link. Requiere que el bot tenga el permiso
    "Create Instant Invite" en el canal, además de "Send Messages"."""
    try:
        async with httpx.AsyncClient() as cliente:
            respuesta = await cliente.post(
                f"{API_BASE}/channels/{channel_id}/invites",
                headers={"Authorization": f"Bot {settings.discord_bot_token}"},
                json={
                    "max_age": 3600,
                    "max_uses": 0,
                    "target_type": 2,
                    "target_application_id": settings.discord_client_id,
                },
                timeout=5.0,
            )
        if respuesta.status_code >= 400:
            logger.warning(
                "No se pudo crear la invitación de Activity (status %s) para channel_id=%s: %s",
                respuesta.status_code,
                channel_id,
                respuesta.text,
            )
            return None
        codigo = respuesta.json().get("code")
        return f"https://discord.gg/{codigo}" if codigo else None
    except Exception:
        logger.exception("Error de red creando la invitación de Activity para channel_id=%s", channel_id)
        return None


async def notificar_inicio_partida(channel_id: str | None, nombre: str) -> None:
    """Avisa en el canal de texto que alguien empezó a jugar, con un link de
    invitación que Discord muestra como tarjeta con el ícono de la app y
    botón de unirse.

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

    invitacion = await crear_invitacion_actividad(channel_id)
    contenido = f"🎮 **{nombre}** empezó a jugar Wordle en Español"
    if invitacion:
        # Con el link solo, en su propia línea, Discord lo "despliega" como
        # tarjeta rica automáticamente — no hace falta más marcado.
        contenido += f"\n{invitacion}"

    try:
        async with httpx.AsyncClient() as cliente:
            respuesta = await cliente.post(
                f"{API_BASE}/channels/{channel_id}/messages",
                headers={"Authorization": f"Bot {settings.discord_bot_token}"},
                json={"content": contenido},
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
