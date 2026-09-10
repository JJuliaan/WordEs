"""Punto único de configuración del servidor.

Ningún otro módulo debe leer variables de entorno directamente (nada de
`os.getenv`/`load_dotenv` fuera de este archivo): todos importan `settings`
desde acá. Así, si mañana cambia de dónde sale un valor (.env, secretos de la
plataforma, lo que sea), sólo hay un lugar que tocar — "variaciones
protegidas" (GRASP): este módulo es la interfaz estable que aísla al resto
del código de cómo/desde dónde se configura.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # --- Discord OAuth (identificar usuarios) ---
    discord_client_id: str = ""
    discord_client_secret: str = ""

    # --- Discord Bot (postear mensajes en un canal) ---
    # Credencial DISTINTA a las de arriba — se saca de Developer Portal →
    # Bot → Token. Sin esto, notificaciones.py simplemente no manda nada.
    discord_bot_token: str = ""

    # --- Reglas de la partida ---
    max_intentos: int = 8
    max_pistas: int = 3
    longitud_palabra: int = 5

    # --- Sistema de puntos ---
    # Por cada letra verde/amarilla distinta descubierta en la ronda (ganada o
    # no); ver `puntaje.py` para cómo se deduplican across intentos.
    puntos_por_verde: int = 10
    puntos_por_amarillo: int = 5
    # Bonus fijo por adivinar la palabra, más un extra por cada intento que
    # sobró (adivinar rápido vale más que adivinar en el último intento).
    bonus_victoria: int = 20
    puntos_por_intento_sobrante: int = 5
    # Cada pista pedida cuesta más que la anterior (base, 2×base, 3×base...)
    # para desalentar abusar del botón sin tener que ponerle un tope muy chico.
    costo_base_pista: int = 15

    # --- Red / CORS ---
    cors_allow_origins: str = "*"

    # --- API externa de palabras aleatorias ---
    random_word_api_url: str = "https://random-word-api.herokuapp.com/word"
    random_word_api_intentos: int = 5
    random_word_api_timeout: float = 5.0

    @property
    def cors_allow_origins_lista(self) -> list[str]:
        return [origen.strip() for origen in self.cors_allow_origins.split(",")]


settings = Settings()
