"use client";

import { ReactNode } from "react";

interface LayerToggleProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  count: number | string;
  onClick: () => void;
}

export default function LayerToggle({
  active,
  icon,
  label,
  count,
  onClick,
}: LayerToggleProps) {
  return (
    <button
      className={`layer-row ${active ? "active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="layer-icon">{icon}</span>
      <span className="layer-name">{label}</span>
      {count !== "" && <span className="layer-count">{count}</span>}
      <span className={`switch ${active ? "on" : ""}`} aria-hidden="true" />
    </button>
  );
}
