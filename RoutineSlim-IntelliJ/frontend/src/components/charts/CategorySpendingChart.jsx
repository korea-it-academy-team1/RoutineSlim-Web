import React from "react";
import { money } from "../../api/apiClient";
const palette = [
  "#7047ff",
  "#a18aff",
  "#c3b5ff",
  "#8cc5ff",
  "#6bd6ba",
  "#f6bb73",
  "#e9a5d2",
];
export default function CategorySpendingChart({
  entries = [],
  label = "카테고리별 지출",
}) {
  const rows = entries.filter((x) => Number(x.amount) > 0),
    total = rows.reduce((sum, x) => sum + Number(x.amount), 0);
  let position = 0;
  const stops = rows.map((row, i) => {
    const start = position;
    position += (Number(row.amount) / total) * 100;
    return `${palette[i % palette.length]} ${start}% ${position}%`;
  });
  return (
    <div className="donut-summary">
      <div
        className="spending-donut"
        role="img"
        aria-label={`${label}, 합계 ${money(total)}`}
        style={{
          background: total ? `conic-gradient(${stops.join(",")})` : "#efedf7",
        }}
      >
        <div>
          <small>총 지출</small>
          <strong>{money(total)}</strong>
        </div>
      </div>
      {rows.length ? (
        <ul className="chart-legend">
          {rows.map((row, i) => (
            <li key={row.category}>
              <i style={{ background: palette[i % palette.length] }} />
              <span>{row.category}</span>
              <b>{Math.round((Number(row.amount) / total) * 100)}%</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">등록된 지출이 없습니다.</p>
      )}
    </div>
  );
}
