import { useServiceCatalog } from "../../hooks/useServiceCatalog";
import React from "react";
const palette = [
  "#7047ff",
  "#a18aff",
  "#c3b5ff",
  "#8cc5ff",
  "#6bd6ba",
  "#f6bb73",
  "#e9a5d2",
];
export default function ServiceBadge({ name = "", icon, background }) {
  const catalog = useServiceCatalog();
  const entry = catalog.find(
    (x) => x.name.toLowerCase() === name.toLowerCase(),
  );
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % palette.length;
  return (
    <span
      className="service-badge"
      style={{ background: background || entry?.background || palette[hash] }}
      aria-hidden="true"
    >
      {icon || entry?.icon || name.slice(0, 1).toUpperCase() || "S"}
    </span>
  );
}
