# BYKART — Bergen Real-Time Transit Dashboard

A real-time transit dashboard for **Bergen, Norway** that visualises live
bus positions (Entur), vessel positions (AIS), traffic counting points
(Statens vegvesen), and current weather (MET Norway) on an interactive 3D map.

## Architecture

```
bykart/
├── backend/               # Python FastAPI service
│   ├── app/
│   │   ├── main.py        # API routes + health, feed, analytics endpoints
│   │   ├── config.py      # Environment-driven configuration
│   │   ├── models.py      # Pydantic data models
│   │   ├── cache.py       # In-memory cache with TTL
│   │   ├── utils.py       # JSON parsing helpers
│   │   ├── analytics.py   # Request tracking + statistics
│   │   └── services/      # Data source clients
│   │       ├── http.py    # Shared async HTTP client
│   │       └── transit.py # Bus / ship / traffic / weather fetchers
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
└── frontend/              # Next.js 16 + React 19 application
    ├── app/
    │   ├── layout.tsx     # Root layout (Inter + JetBrains Mono fonts)
    │   ├── page.tsx       # Home page
    │   ├── globals.css    # Global styles + Tailwind
    │   ├── lib/
    │   │   ├── api.ts     # Backend API client
    │   │   ├── types.ts   # TypeScript models
    │   │   └── map-utils.ts # Map helper functions
    │   └── components/
    │       ├── MapDashboard.tsx  # Main dashboard (map + sidebar)
    │       └── LayerToggle.tsx   # Layer toggle button
    ├── public/
    ├── package.json
    └── .env.example
```

The **frontend** talks exclusively to the **backend**, which in turn
fetches, caches, and aggregates data from open public data APIs.

## Quick start

```bash
# Terminal 1 — start the Python backend
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — start the Next.js frontend
cd ../frontend
npm install
cp .env.example .env.local
npm run dev

# Visit http://localhost:3000
```

## Docker

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000 (docs at /docs)
```

## Tech stack

| Layer  | Technology |
|--------|-----------|
| Backend | Python 3, FastAPI, httpx, Pydantic |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Maps | MapLibre GL |
| Fonts | Inter (body), JetBrains Mono (monospace) |
| Icons | Lucide React |

## License

MIT
