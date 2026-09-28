/**
 * API client for the Python (FastAPI) backend.
 *
 * The base URL is configurable via the ``NEXT_PUBLIC_API_URL`` env var
 * and defaults to ``http://localhost:8000`` for local development.
 */

import type { AnalyticsResponse, FeedResponse, HealthResponse } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetcher<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  /** Combined feed — buses, ships, traffic, weather in a single payload. */
  getFeed: () => fetcher<FeedResponse>("/api/feed"),
  /** Aggregated analytics and request metrics. */
  getAnalytics: () => fetcher<AnalyticsResponse>("/api/analytics"),
  /** Liveness probe. */
  getHealth: () => fetcher<HealthResponse>("/health"),
};
