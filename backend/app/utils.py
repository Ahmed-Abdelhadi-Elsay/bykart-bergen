"""Utility helpers for parsing heterogeneous JSON from upstream APIs."""

from typing import Any


def as_record(value: Any) -> dict[str, Any]:
    """Coerce *value* into a dict, returning ``{}`` when not possible."""
    if value is not None and isinstance(value, dict):
        return value
    return {}


def list_at(data: Any, keys: list[str]) -> list[Any]:
    """Return the first list found under *keys* in *data* (or data itself)."""
    if isinstance(data, list):
        return data
    source = as_record(data)
    for key in keys:
        value = source.get(key)
        if isinstance(value, list):
            return value
    return []


def number_at(item: dict[str, Any], keys: list[str]) -> float | None:
    """Return the first numeric value found under *keys* in *item*."""
    for key in keys:
        value = item.get(key)
        if value in (None, "",):
            continue
        parsed = value if isinstance(value, (int, float)) else float(value)
        if isinstance(parsed, (int, float)) and parsed == parsed:
            return float(parsed)
    return None


def text_at(item: dict[str, Any], keys: list[str], fallback: str) -> str:
    """Return the first non-empty string under *keys* in *item*."""
    for key in keys:
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value
        if isinstance(value, (int, float)):
            return str(value)
    return fallback
