/**
 * TypeScript types mirroring the Python backend (Pydantic) models.
 */

export type MarkerKind = "bus" | "ship" | "traffic";

export interface Marker {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lon: number;
  kind: MarkerKind;
}

export interface Weather {
  temperature: number | null;
  description: string;
}

export interface FeedResponse {
  buses: Marker[];
  ships: Marker[];
  traffic: Marker[];
  weather: Weather;
  updated_at: string | null;
  bus_online: boolean;
  ship_online: boolean;
}

export interface AnalyticsResponse {
  timestamp: string;
  bus_count: number;
  ship_count: number;
  traffic_count: number;
  weather_temperature: number | null;
  weather_description: string;
  total_requests: number;
  uptime_seconds: number;
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
}

export interface DemoBooking {
  reference: string;
  passengerName: string;
  from: string;
  to: string;
  vehicleName?: string;
  vehicleKind?: "bus" | "ship";
  passengers: number;
  farePerPassenger: number;
  total: number;
  createdAt: string;
}
