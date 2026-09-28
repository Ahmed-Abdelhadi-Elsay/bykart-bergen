"""Transit data services — buses, ships, traffic sensors, weather."""

from typing import Any

from ..config import settings
from ..models import Marker, Weather
from ..utils import as_record, list_at, number_at, text_at
from .http import fetch_json


def _bergen_params() -> dict[str, Any]:
    return {"lat": settings.bergen_lat, "lon": settings.bergen_lon}


# ── Buses (Entur) ──────────────────────────────────────────────────────
async def fetch_buses() -> list[Marker]:
    """Fetch live bus positions near Bergen."""
    params = _bergen_params()
    params["radius_km"] = settings.bus_radius
    params["mode"] = "BUS"
    params["limit"] = str(settings.bus_limit)
    data = await fetch_json("entur/find_live_vehicles_nearby", params)
    return _parse_markers(
        list_at(data, ["vehicles", "items"]), "bus", settings.bus_limit
    )


def _parse_markers(
    raw_items: list[Any], kind: str, default_limit: int
) -> list[Marker]:
    markers: list[Marker] = []
    for index, raw in enumerate(raw_items):
        item = as_record(raw)
        lat = number_at(item, ["lat", "latitude"])
        lon = number_at(item, ["lon", "longitude"])
        if lat is None or lon is None:
            continue
        if kind == "bus":
            line = text_at(item, ["line", "line_name"], "Buss")
            destination = text_at(item, ["destination"], "")
            name = f"{line}{f' · {destination}' if destination else ''}"
            markers.append(Marker(
                id=text_at(item, ["vehicle_id", "id"], f"bus-{index}"),
                name=name,
                detail=text_at(item, ["last_updated"], "Entur · live posisjon"),
                lat=lat,
                lon=lon,
                kind="bus",
            ))
        elif kind == "ship":
            markers.append(Marker(
                id=text_at(item, ["vessel_id", "id", "mmsi"], f"ship-{index}"),
                name=text_at(item, ["navn", "name", "ship_name"], "Skip"),
                detail=text_at(item, ["destinasjon", "destination", "sist_oppdatert"], "AIS · sist rapporterte posisjon"),
                lat=lat,
                lon=lon,
                kind="ship",
            ))
        elif kind == "traffic":
            nested = as_record(item.get("coordinates"))
            lat = lat if lat is not None else (number_at(nested, ["lat", "latitude"]) or None)
            lon = lon if lon is not None else (number_at(nested, ["lon", "longitude"]) or None)
            if lat is None or lon is None:
                continue
            markers.append(Marker(
                id=text_at(item, ["id", "point_id", "idspunkt"], f"traffic-{index}"),
                name=text_at(item, ["name", "navn", "description"], "Tellepunkt"),
                detail=text_at(item, ["latest_hourly_data"], "Statens vegvesen · trafikkmåling"),
                lat=lat,
                lon=lon,
                kind="traffic",
            ))
    return markers[:default_limit]


# ── Ships (AIS) ────────────────────────────────────────────────────────
async def fetch_ships() -> list[Marker]:
    """Fetch live vessel positions near Bergen."""
    params = _bergen_params()
    params["radius_km"] = settings.ship_radius
    params["limit"] = str(settings.ship_limit)
    data = await fetch_json("ais/find_vessels_nearby", params)
    return _parse_markers(
        list_at(data, ["fartoy", "vessels", "items"]), "ship", settings.ship_limit
    )


# ── Traffic sensors (Vegvesen) ─────────────────────────────────────────
async def fetch_traffic() -> list[Marker]:
    """Fetch traffic counting points near Bergen."""
    params = _bergen_params()
    params["radius_km"] = settings.traffic_radius
    params["operational_only"] = "true"
    params["limit"] = str(settings.traffic_limit)
    data = await fetch_json("vegvesen/find_traffic_points", params)
    return _parse_markers(
        list_at(data, ["points", "traffic_points", "trafficPoints", "tellepunkter", "items"]),
        "traffic",
        settings.traffic_limit,
    )


# ── Weather (MET Norway) ───────────────────────────────────────────────
WEATHER_LABELS: dict[str, str] = {
    "clearsky_day": "Klart",
    "clearsky_night": "Klart",
    "fair_day": "Lettskyet",
    "fair_night": "Lettskyet",
    "partlycloudy_day": "Delvis skyet",
    "partlycloudy_night": "Delvis skyet",
    "cloudy": "Skyet",
    "lightrain": "Lett regn",
    "rain": "Regn",
    "heavyrain": "Kraftig regn",
    "fog": "Tåke",
    "snow": "Snøvær",
    "sleet": "Sludd",
}


async def fetch_weather() -> Weather:
    """Fetch current weather for Bergen."""
    params = _bergen_params()
    data = await fetch_json("weather/get_current_weather", params)
    weather = as_record(data)
    symbol = text_at(weather, ["symbol"], "")
    description = text_at(
        weather,
        ["summary", "description", "condition"],
        WEATHER_LABELS.get(symbol) or symbol.replace("_", " ") or "Værdata fra MET Norge",
    )
    return Weather(
        temperature=number_at(
            weather,
            ["temperature_c", "air_temperature", "temperature", "temp", "airTemperature"],
        ),
        description=description,
    )
