"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    """Centralised configuration for the transit backend."""

    # External API
    api_base_url: str = os.getenv(
        "API_BASE_URL", "https://allemannsdata.com/wiki/api/v1/kilder"
    )
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "15"))

    # Bergen coordinates
    bergen_lat: float = float(os.getenv("BERGEN_LAT", "60.39299"))
    bergen_lon: float = float(os.getenv("BERGEN_LON", "5.32415"))

    # Request limits
    bus_limit: int = int(os.getenv("BUS_LIMIT", "100"))
    ship_limit: int = int(os.getenv("SHIP_LIMIT", "100"))
    traffic_limit: int = int(os.getenv("TRAFFIC_LIMIT", "40"))

    # Search radii (km)
    bus_radius: float = float(os.getenv("BUS_RADIUS", "2.5"))
    ship_radius: float = float(os.getenv("SHIP_RADIUS", "4.5"))
    traffic_radius: float = float(os.getenv("TRAFFIC_RADIUS", "8"))

    # Cache TTLs (seconds)
    bus_cache_ttl: int = int(os.getenv("BUS_CACHE_TTL", "30"))
    ship_cache_ttl: int = int(os.getenv("SHIP_CACHE_TTL", "300"))
    traffic_cache_ttl: int = int(os.getenv("TRAFFIC_CACHE_TTL", "900"))
    weather_cache_ttl: int = int(os.getenv("WEATHER_CACHE_TTL", "60"))
    feed_cache_ttl: int = int(os.getenv("FEED_CACHE_TTL", "15"))

    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))


settings = Settings()
