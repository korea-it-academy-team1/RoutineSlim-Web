import React, { useState } from "react";
import { calculateScenario } from "../utils/savingsScenario";
import { monthlyAmount } from "../../subscriptions/utils/subscriptionCalculations";
import { formatWon } from "../../../shared/lib/format";
import { exportCsv } from "../../../shared/lib/csvExport";

export default function SavingsScenario({ subscriptions }) {
  const [selection, setSelection] = useState(null);
  const [months, setMonths] = useState(12);
  const [error, setError] = useState("");
  const active = subscriptions.filter((s) => ["active", "review"].includes(s.status));
  const selected = selection ?? active.filter((s) => s.status === "review").map((s) => s.id);
  const result = calculateScenario(active, selected, months);
  function toggle(id) {
    setSelection(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  function exportResult() {
    try {
      exportCsv(
        "RoutineSlim-절약-시나리오.csv",
        ["구독", "월 환산 금액", `${months}개월 예상 절감액`],
        result.chosen.map((s) => [s.name, monthlyAmount(s), monthlyAmount(s) * months]),
      );
      setError("");
    } catch {
      setError("파일을 내보내지 못했습니다. 다시 시도해주세요.");
    }
  }
  return (
    <section className="panel scenario-panel" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">직접 고르는 절약 시뮬레이터</h2>
      <p className="muted">
        구독을 선택해 비용이 얼마나 줄어드는지 비교하세요. 선택해도 실제 구독과 절약 검토 상태는
        바뀌지 않습니다.
      </p>
      <div className="tools-toolbar">
        <label>
          시뮬레이션 기간{" "}
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n}개월
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary small"
          disabled={!active.length}
          onClick={() => setSelection(active.map((s) => s.id))}
        >
          전체 선택
        </button>
        <button
          className="secondary small"
          disabled={!result.chosen.length}
          onClick={() => setSelection([])}
        >
          선택 초기화
        </button>
      </div>
      <div className="scenario-options">
        {active.map((s) => (
          <label className="scenario-option" key={s.id}>
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() => toggle(s.id)}
            />
            <span>{s.name} 비용 제외</span>
            <strong>월 {formatWon(monthlyAmount(s))}</strong>
          </label>
        ))}
        {!active.length && <p className="muted">활성 구독을 등록하면 시뮬레이션할 수 있습니다.</p>}
      </div>
      <div className="scenario-summary" aria-live="polite" aria-atomic="true">
        <p>
          선택한 구독 <b>{result.chosen.length}개</b>
        </p>
        <p>
          예상 월 절감액 <strong>{formatWon(result.monthlySavings)}</strong> ({result.percent}%)
        </p>
        <p>
          {months}개월 누적 예상 절감액 <strong>{formatWon(result.cumulativeSavings)}</strong>
        </p>
        <p>
          선택 항목 제외 후 월 예상 비용 <b>{formatWon(result.remaining)}</b>
        </p>
      </div>
      {result.monthlySavings > 0 && (
        <div
          className="scenario-timeline"
          role="img"
          aria-label={`${months}개월 동안 매월 ${formatWon(result.monthlySavings)}씩, 총 ${formatWon(result.cumulativeSavings)} 예상 절감`}
        >
          {result.timeline.map((item) => (
            <div key={item.month}>
              <span
                className="scenario-bar"
                style={{ height: `${(item.month / months) * 100}%` }}
              />
              <small>{item.month}개월</small>
            </div>
          ))}
        </div>
      )}
      <button className="secondary" disabled={!result.chosen.length} onClick={exportResult}>
        시뮬레이션 CSV 내보내기
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="muted">
        월 환산액을 기준으로 선택한 항목의 비용이 즉시 중단된다고 가정합니다. 이미 낸 연간 요금의
        환불·위약금·실제 결제일은 반영하지 않습니다. 선택은 이 화면을 나가면 초기화됩니다.
      </p>
    </section>
  );
}
