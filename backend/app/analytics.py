"""Analytics and statistics aggregation for the transit dashboard.

Tracks request counts and computes summary statistics from cached
transit data so the frontend can display an overview panel.
"""

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .models import AnalyticsResponse


@dataclass
class AnalyticsCollector:
    """Collects request metrics and provides aggregated statistics."""

    total_requests: int = 0
    started_at: float = field(default_factory=time.time)

    def record_request(self) -> None:
        self.total_requests += 1

    def uptime_seconds(self) -> float:
        return round(time.time() - self.started_at, 1)

    def build_report(
        self,
        bus_count: int,
        ship_count: int,
        traffic_count: int,
        temperature: float | None,
        weather_description: str,
    ) -> AnalyticsResponse:
        return AnalyticsResponse(
            timestamp=datetime.now(timezone.utc),
            bus_count=bus_count,
            ship_count=ship_count,
            traffic_count=traffic_count,
            weather_temperature=temperature,
            weather_description=weather_description,
            total_requests=self.total_requests,
            uptime_seconds=self.uptime_seconds(),
        )


collector = AnalyticsCollector()
