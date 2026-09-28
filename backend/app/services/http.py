"""Async HTTP client for upstream data sources."""

from typing import Any

import httpx

from ..config import settings

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return a shared ``httpx`` client (created lazily)."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=settings.api_base_url,
            timeout=httpx.Timeout(settings.request_timeout),
        )
    return _client


async def fetch_json(path: str, params: dict[str, Any]) -> Any:
    """Fetch *path* with *params* and return the JSON payload.

    If the response contains a **data** key (wrapped envelope) the inner
    value is unwrapped before returning.
    """
    client = get_client()
    response = await client.get("/" + path, params=params)
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload
