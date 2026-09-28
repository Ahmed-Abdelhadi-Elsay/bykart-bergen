"""Lightweight in-memory cache with per-key TTL."""

import time
from typing import Any, Optional


class Cache:
    """A simple dict-based cache with time-to-live support.

    Each ``set`` call records a timestamp; ``get`` returns ``None``
    when the TTL has elapsed so callers know to refresh.
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str, ttl: int) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, timestamp = entry
        if time.time() - timestamp >= ttl:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.time())

    def clear(self) -> None:
        self._store.clear()

    def keys(self) -> list[str]:
        return list(self._store.keys())


cache = Cache()
