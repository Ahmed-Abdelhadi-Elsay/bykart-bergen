# BYKART — Bergen Transit Backend

Python (FastAPI) backend that aggregates **real-time transit data** for
Bergen, Norway and exposes it through a JSON API for the frontend
dashboard.

## Purpose

The backend acts as a **caching reverse-proxy** and **analytics layer**
between open data sources and the Next.js frontend:

| Source        | Service                  | Endpoint                          |
| ------------- | ------------------------ | --------------------------------- |
| Entur         | Live buses               | `/api/buses`                      |
| AIS           | Live ships / vessels      | `/api/ships`                      |
| Statens vegvesen | Traffic counters        | `/api/traffic`                    |
| MET Norway    | Current weather           | `/api/weather`                    |

Additional endpoints:

| Endpoint         | Description                                   |
| ---------------- | --------------------------------------------- |
| `/api/feed`      | Combined payload (buses + ships + traffic + weather) |
| `/api/analytics` | Summary statistics and request counts         |
| `/api/cache/status` | Cache key inventory                       |
| `/health`        | Liveness probe                                 |

## Quick start

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the API server
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for the interactive API docs.

## Configuration

Copy `.env.example` to `.env` and adjust values as needed. All settings
are optional — sensible defaults are provided.

## Caching

Each upstream source is cached in-memory with a configurable TTL:

- Buses: 30 s
- Ships: 300 s
- Traffic: 900 s
- Weather: 60 s
- Combined feed: 15 s

The cache is refreshed on the first request after the TTL expires, then
served from cache until the next expiry.
