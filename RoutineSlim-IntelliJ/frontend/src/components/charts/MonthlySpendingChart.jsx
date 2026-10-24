import React from "react";
import { money } from "../../api/apiClient";
export default function MonthlySpendingChart({ history = [] }) {
  const max = Math.max(1, ...history.map((x) => Number(x.amount) || 0));
  return (
    <div>
      <div
        className="spending-bars"
        role="img"
        aria-label="최근 월별 실제 지출 그래프"
      >
        {history.map((x) => (
          <div className="spending-bar-column" key={x.month}>
            <small>{money(x.amount)}</small>
            <div className="spending-bar-track">
              <i style={{ height: `${(Number(x.amount) / max) * 100}%` }} />
            </div>
            <span>{x.month.slice(5)}월</span>
          </div>
        ))}
      </div>
      <p className="muted chart-caption">
        실제 결제 기록 기준 · 기록이 없는 월은 0원
      </p>
    </div>
  );
}
