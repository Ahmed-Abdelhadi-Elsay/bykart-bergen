"""Pydantic data models shared across the backend."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Marker(BaseModel):
    """A single point-of-interest on the map."""

    id: str
    name: str
    detail: str
    lat: float
    lon: float
    kind: Literal["bus", "ship", "traffic"]


class Weather(BaseModel):
    """Current weather conditions for a location."""

    temperature: Optional[float] = None
    description: str


class SourceStatus(BaseModel):
    """Online status for each upstream data source."""

    bus_online: bool = False
    ship_online: bool = False


class FeedResponse(BaseModel):
    """Aggregated response returned by ``GET /api/feed``."""

    buses: list[Marker] = Field(default_factory=list)
    ships: list[Marker] = Field(default_factory=list)
    traffic: list[Marker] = Field(default_factory=list)
    weather: Weather
    updated_at: Optional[datetime] = None
    bus_online: bool = False
    ship_online: bool = False


class AnalyticsResponse(BaseModel):
    """Statistics computed from cached data sources."""

    timestamp: datetime
    bus_count: int
    ship_count: int
    traffic_count: int
    weather_temperature: Optional[float]
    weather_description: str
    total_requests: int
    uptime_seconds: float


class HealthResponse(BaseModel):
    """Liveness probe response."""

    status: str = "ok"
    uptime_seconds: float
