import { useAccountSetting } from "../../hooks/useAccountSetting";
import React, { useEffect, useState } from "react";
import { request, money, today } from "../../api/apiClient";
import CategorySpendingChart from "../charts/CategorySpendingChart";
import ServiceBadge from "../common/ServiceBadge";
export default function SpendingSummaryPanel({ page, user, navigate }) {
  const setting = useAccountSetting(user, "reminder-days", 7);
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    function load() {
      Promise.all([
        request("/api/v1/expenses/summary"),
        request("/api/v1/reminders"),
        request("/api/v1/savings/summary"),
      ])
        .then(([expense, reminders, savings]) => {
          if (active) {
            setData({
              expense,
              reminders: Array.isArray(reminders) ? reminders : [],
              savings,
            });
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    load();
    window.addEventListener("routineslim:subscriptions", load);
    return () => {
      active = false;
      window.removeEventListener("routineslim:subscriptions", load);
    };
  }, [page, user]);
  return (
    <aside className="overview-rail" aria-label="지출 요약 및 빠른 이동">
      <section className="panel rail-summary">
        <div className="panel-heading">
          <h2>나의 구독 현황</h2>
          <span className="live-label">이번 달</span>
        </div>
        {data ? (
          <>
            <strong className="rail-total">
              {money(data.expense?.monthlyTotal)}
            </strong>
            <p className="muted">
              월 예상 구독료 · {data.expense?.subscriptionCount || 0}개 서비스
            </p>
            <CategorySpendingChart
              entries={Object.entries(data.expense?.byCategory || {}).map(
                ([category, amount]) => ({ category, amount }),
              )}
            />
          </>
        ) : (
          <p className="muted">{error || "요약을 불러오는 중..."}</p>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>다가오는 결제</h2>
          <button className="text-action" onClick={() => navigate("calendar")}>
            전체 보기 →
          </button>
        </div>
        {data?.reminders.filter((x) => x.daysUntil <= Number(setting.value))
          .length ? (
          data.reminders
            .filter((x) => x.daysUntil <= Number(setting.value))
            .slice(0, 5)
            .map((x, i) => (
              <div
                className="rail-payment"
                key={`${x.subscriptionId}-${x.date}-${i}`}
              >
                <ServiceBadge name={x.name} />
                <div>
                  <b>{x.name}</b>
                  <small>
                    {x.date} ·{" "}
                    {x.daysUntil === 0 ? "오늘" : `${x.daysUntil}일 후`}
                  </small>
                </div>
                <strong>{money(x.amount)}</strong>
              </div>
            ))
        ) : (
          <p className="muted">
            {data
              ? "예정된 결제가 없습니다."
              : "결제 일정을 확인하고 있습니다."}
          </p>
        )}
      </section>
      <section className="rail-tip">
        <span className="eyebrow">SMART SAVING</span>
        <h2>
          작은 정리가 만드는
          <br />
          가벼운 한 달
        </h2>
        <p>
          절약 검토로 표시한 구독을 확인하고
          <br />
          나에게 맞는 목표를 세워보세요.
        </p>
        {data && (
          <strong>월 검토액 {money(data.savings?.monthlyReviewSavings)}</strong>
        )}
        <button className="primary" onClick={() => navigate("goals")}>
          절약 목표 관리 →
        </button>
      </section>
      <section className="panel rail-links">
        <h2>빠른 메뉴</h2>
        <button onClick={() => navigate("trials")}>
          무료체험 종료 확인 <span>↗</span>
        </button>
        <button onClick={() => navigate("comparison")}>
          구독 요금 비교 <span>↗</span>
        </button>
        <button onClick={() => navigate("support")}>
          도움이 필요하세요? <span>↗</span>
        </button>
      </section>
      <p className="rail-date">{today()} · RoutineSlim</p>
    </aside>
  );
}
