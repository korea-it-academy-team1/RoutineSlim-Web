import { useServiceCatalog } from "../hooks/useServiceCatalog";
import React from "react";
const palette = ["#7047ff", "#a18aff", "#c3b5ff", "#8cc5ff", "#6bd6ba", "#f6bb73", "#e9a5d2"];
function serviceBrand(name) {
  const key = name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s+._-]/g, "");
  if (/^(netflix|넷플릭스)/.test(key)) return ["netflix", "#141414"];
  if (/^(spotify|스포티파이)/.test(key)) return ["spotify", "#141414"];
  if (/^(disney|디즈니)/.test(key)) return ["disney", "#242469"];
  if (/^(youtube|유튜브|ytpremium)/.test(key)) return ["youtube", "#dc4b4b"];
  if (/^(icloud|아이클라우드)/.test(key)) return ["icloud", "#f0f5ff"];
  if (/^(coupangwow|쿠팡와우)/.test(key)) return ["coupang", "#a3a6b8"];
  return null;
}
function ServiceMark({ brand }) {
  const props = {
    viewBox: "0 0 32 32",
    width: "80%",
    height: "80%",
    focusable: "false",
    "aria-hidden": true,
  };
  switch (brand) {
    case "netflix":
      return (
        <svg {...props}>
          <path fill="#b1060e" d="M8 4h5v24H8zM19 4h5v24h-5z" />
          <path fill="#e50914" d="M8 4h5l11 24h-5z" />
        </svg>
      );
    case "spotify":
      return (
        <svg {...props}>
          <circle cx="16" cy="16" r="13" fill="#1ed760" />
          <g fill="none" stroke="#141414" strokeLinecap="round">
            <path d="M8 12c5-2 11-1.7 16 1" strokeWidth="2.6" />
            <path d="M9 17c4.5-1.6 9.5-1.1 13.5 1" strokeWidth="2.2" />
            <path d="M10 21.5c4-1.1 7.5-.7 11 1" strokeWidth="1.9" />
          </g>
        </svg>
      );
    case "disney":
      return (
        <svg {...props}>
          <path
            fill="none"
            stroke="#b1c5ff"
            strokeWidth="1.3"
            strokeLinecap="round"
            d="M5 10C10 3 21 3 27 10"
          />
          <path
            fill="white"
            d="M6 12h6c6 0 9 3 9 8s-3 8-9 8H6V12zm4 4v8h2c3 0 5-1.4 5-4s-2-4-5-4h-2zM25 15h2v4h4v2h-4v4h-2v-4h-4v-2h4z"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg {...props}>
          <path fill="white" d="M11 7.5v17l15-8.5z" />
        </svg>
      );
    case "icloud":
      return (
        <svg {...props}>
          <path
            fill="none"
            stroke="#6293ff"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 24h13a6 6 0 0 0 .7-12 8 8 0 0 0-15.3-1.4A6.8 6.8 0 0 0 10 24z"
          />
        </svg>
      );
    case "coupang":
      return (
        <svg {...props}>
          <path fill="white" d="M24 9a11 11 0 1 0 0 14l-4-3a6 6 0 1 1 0-8l4-3z" />
        </svg>
      );
    default:
      return null;
  }
}
export default function ServiceBadge({ name = "", icon, background }) {
  const catalog = useServiceCatalog(true);
  const label = String(name || "").trim();
  const entry = catalog.find((x) => x.name.toLowerCase() === label.toLowerCase());
  const brand = serviceBrand(label);
  let hash = 0;
  for (const char of label) hash = (hash + char.charCodeAt(0)) % palette.length;
  return (
    <span
      className="service-badge"
      data-service={brand?.[0] || "custom"}
      style={{ background: background || entry?.background || brand?.[1] || palette[hash] }}
      aria-hidden="true"
    >
      {icon ||
        entry?.icon ||
        (brand ? <ServiceMark brand={brand[0]} /> : Array.from(label)[0]?.toUpperCase() || "S")}
    </span>
  );
}
