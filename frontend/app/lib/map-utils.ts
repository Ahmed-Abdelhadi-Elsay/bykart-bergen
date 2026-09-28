/**
 * Utility helpers for the MapLibre map — kept separate from the
 * main component for clarity and testability.
 */

import type { FeatureCollection, Point } from "geojson";
import type { Marker } from "./types";

export function markerFeatures(markers: Marker[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: markers.map((marker) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [marker.lon, marker.lat],
      },
      properties: {
        id: marker.id,
        name: marker.name,
        detail: marker.detail,
        kind: marker.kind,
      },
    })),
  };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char] ?? char;
  });
}
