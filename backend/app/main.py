"""FastAPI application: routes and startup/shutdown lifecycle."""

import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .analytics import collector
from .cache import cache
from .config import settings
from .models import AnalyticsResponse, FeedResponse, HealthResponse, Marker, Weather
from .services.http import _client
from .services.transit import fetch_buses, fetch_ships, fetch_traffic, fetch_weather

FEED_KEYS_TTL = {
    "buses": settings.bus_cache_ttl,
    "ships": settings.ship_cache_ttl,
    "traffic": settings.traffic_cache_ttl,
    "weather": settings.weather_cache_ttl,
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    cache.clear()
    yield
    if _client is not None:
        await _client.aclose()
    cache.clear()


app = FastAPI(
    title="BYKART — Bergen Transit Backend",
    description="Python backend serving real-time transit data for the Bergen "
    "dashboard. Caches upstream API responses and provides analytics.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _track_requests(request: Request, call_next: Any) -> Any:
    if not request.url.path.startswith(("/docs", "/openapi.json", "/health")):
        collector.record_request()
    return await call_next(request)


def _read_cache(key: str, ttl: int) -> Any:
    return cache.get(key, ttl)


async def _fetch_or_cached(key: str, ttl: int, coro: Any) -> Any:
    """Return cached value for *key*; on miss, run *coro*, cache, and return."""
    cached = _read_cache(key, ttl)
    if cached is not None:
        return cached
    try:
        result = await coro()
        cache.set(key, result)
        return result
    except (httpx.HTTPError, httpx.HTTPStatusError):
        return None


# ── Individual endpoints ───────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(uptime_seconds=collector.uptime_seconds())


@app.get("/api/buses", response_model=list[Marker])
async def api_buses() -> list[Marker]:
    return await _fetch_or_cached("buses", settings.bus_cache_ttl, fetch_buses) or []


@app.get("/api/ships", response_model=list[Marker])
async def api_ships() -> list[Marker]:
    return await _fetch_or_cached("ships", settings.ship_cache_ttl, fetch_ships) or []


@app.get("/api/traffic", response_model=list[Marker])
async def api_traffic() -> list[Marker]:
    return await _fetch_or_cached("traffic", settings.traffic_cache_ttl, fetch_traffic) or []


@app.get("/api/weather", response_model=Weather)
async def api_weather() -> Weather:
    weather = await _fetch_or_cached(
        "weather", settings.weather_cache_ttl, fetch_weather
    )
    if weather is None:
        raise HTTPException(status_code=502, detail="Unable to fetch weather data")
    return weather


# ── Aggregated feed ───────────────────────────────────────────────────

@app.get("/api/feed", response_model=FeedResponse)
async def api_feed() -> FeedResponse:
    """Return a single combined payload consumed by the frontend dashboard."""
    cached = cache.get("feed", settings.feed_cache_ttl)
    if cached is not None:
        return cached  # type: ignore[return-value]

    results = await asyncio.gather(
        _fetch_or_cached("buses", settings.bus_cache_ttl, fetch_buses),
        _fetch_or_cached("ships", settings.ship_cache_ttl, fetch_ships),
        _fetch_or_cached("traffic", settings.traffic_cache_ttl, fetch_traffic),
        _fetch_or_cached("weather", settings.weather_cache_ttl, fetch_weather),
        return_exceptions=False,
    )

    buses, ships, traffic, weather = results
    bus_online = buses is not None
    ship_online = ships is not None

    if not isinstance(weather, Weather):
        weather = Weather(temperature=None, description="Henter værdata")

    feed = FeedResponse(
        buses=buses or [],
        ships=ships or [],
        traffic=traffic or [],
        weather=weather,
        updated_at=datetime.now(timezone.utc),
        bus_online=bus_online,
        ship_online=ship_online,
    )
    cache.set("feed", feed)
    return feed


# ── Analytics ──────────────────────────────────────────────────────────

@app.get("/api/analytics", response_model=AnalyticsResponse)
async def api_analytics() -> AnalyticsResponse:
    bus_count = len(_read_cache("buses", FEED_KEYS_TTL["buses"]) or [])
    ship_count = len(_read_cache("ships", FEED_KEYS_TTL["ships"]) or [])
    traffic_count = len(_read_cache("traffic", FEED_KEYS_TTL["traffic"]) or [])
    weather = _read_cache("weather", FEED_KEYS_TTL["weather"])
    if isinstance(weather, Weather):
        temp, desc = weather.temperature, weather.description
    else:
        temp, desc = None, ""
    return collector.build_report(bus_count, ship_count, traffic_count, temp, desc)


@app.get("/api/cache/status")
async def cache_status() -> dict[str, Any]:
    return {"keys": list(FEED_KEYS_TTL.keys()), "size": len(cache.keys())}
