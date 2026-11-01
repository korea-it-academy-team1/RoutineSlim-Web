import * as reportsApi from "./reportsApi";
import * as savingsApi from "./savingsApi";
import * as subscriptionsApi from "../subscription/subscriptionsApi";
import React, { useEffect, useRef, useState } from "react";
import { formatWon } from "../../global/api/apiClient";
import ServiceBadge from "../../global/components/ServiceBadge";
import MonthlySpendingChart from "../../global/components/MonthlySpendingChart";
export default function DashboardPage({ navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadVersion = useRef(0);
  async function loadDashboard() {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      reportsApi.getExpenseSummary(),
      savingsApi.getSavingsSummary(),
      subscriptionsApi.getSubscriptions(),
      reportsApi.getCurrentMonthlyReport(),
    ]);
    if (version !== loadVersion.current) return;
    const values = results.map((result) => (result.status === "fulfilled" ? result.value : null));
    setData({
      expense: values[0],
      savings: values[1],
      subscriptions: Array.isArray(values[2]) ? values[2] : null,
      report: values[3],
    });
    if (results.some((result) => result.status === "rejected")) {
      setError("일부 정보를 불러오지 못했습니다. 확인할 수 없는 값은 —로 표시합니다.");
    }
    setLoading(false);
  }
  useEffect(() => {
    void loadDashboard();
    return () => {
      loadVersion.current++;
    };
  }, []);
  const displayAmount = (value) => (value == null ? "—" : formatWon(value));
  const count = data?.expense?.subscriptionCount ?? data?.subscriptions?.length;
  return (
    <section className="dashboard-page">
      <div className="heading dashboard-heading">
        <div>
          <span className="eyebrow">MY ROUTINE, SLIM LIFE</span>
          <h1>내 구독 한눈에 보기</h1>
          <p>지출을 확인하고 더 나은 절약 습관을 만들어보세요.</p>
        </div>
        <button className="primary" onClick={() => navigate("subscriptions")}>
          ＋ 구독 등록
        </button>
      </div>
      {error && (
        <div>
          <p className="error" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="secondary small"
            disabled={loading}
            onClick={loadDashboard}
          >
            다시 불러오기
          </button>
        </div>
      )}
      {loading && (
        <p role="status" aria-live="polite">
          불러오는 중...
        </p>
      )}
      {data && (
        <>
          <div className="stats">
            <article className="stat">
              <span>
                월 예상 구독료 <i>₩</i>
              </span>
              <strong>{displayAmount(data.expense?.monthlyTotal)}</strong>
              <small>등록한 구독의 월 환산 금액</small>
            </article>
            <article className="stat">
              <span>
                연간 예상 구독료 <i>↗</i>
              </span>
              <strong>{displayAmount(data.expense?.annualTotal)}</strong>
              <small>한 해의 고정비를 미리 확인해요</small>
            </article>
            <article className="stat">
              <span>
                관리 중인 구독 <i>▦</i>
              </span>
              <strong>{count == null ? "—" : `${count}개`}</strong>
              <small>현재 이용 중인 서비스</small>
            </article>
            <article className="stat">
              <span>
                연간 절약 가능 금액 <i>✦</i>
              </span>
              <strong>{displayAmount(data.savings?.annualPotentialSavings)}</strong>
              <small>절약 검토 구독 기준 예상액</small>
            </article>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>
                내 구독 서비스{" "}
                <span className="count-chip">{data.subscriptions?.length ?? "—"}</span>
              </h2>
              <button className="text-action" onClick={() => navigate("subscriptions")}>
                전체 관리 →
              </button>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>서비스</th>
                    <th>카테고리</th>
                    <th>결제 주기</th>
                    <th>금액</th>
                    <th>상태</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(data.subscriptions || []).slice(0, 8).map((x) => (
                    <tr key={x.id}>
                      <td>
                        <span className="service-name">
                          <ServiceBadge name={x.name} />
                          <b>{x.name}</b>
                        </span>
                      </td>
                      <td>{x.category}</td>
                      <td>
                        {x.cycle === "yearly" ? "매년" : x.cycle === "weekly" ? "매주" : "매월"}
                      </td>
                      <td>
                        <b>{formatWon(x.amount)}</b>
                      </td>
                      <td>
                        <span
                          className={"status-pill " + (x.status === "review" ? "review" : "active")}
                        >
                          {x.status === "review" ? "절약 검토" : "이용 중"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-action"
                          onClick={() => navigate("subscription-detail", x.id)}
                        >
                          상세 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.subscriptions?.length === 0 && (
              <div className="designed-empty">
                <span>▦</span>
                <h3>첫 구독을 등록해보세요</h3>
                <p>서비스를 추가하면 지출 분석이 여기에 표시됩니다.</p>
                <button className="secondary" onClick={() => navigate("subscriptions")}>
                  구독 관리하기
                </button>
              </div>
            )}
            {data.subscriptions === null && (
              <p className="muted">구독 목록을 불러오지 못했습니다.</p>
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>월별 실제 지출</h2>
              <button className="text-action" onClick={() => navigate("monthly")}>
                월간 결산 보기 →
              </button>
            </div>
            {data.report ? (
              <MonthlySpendingChart
                history={Array.isArray(data.report.history) ? data.report.history : []}
              />
            ) : (
              <p className="muted">실제 지출 내역을 불러오지 못했습니다.</p>
            )}
          </section>

          <div className="dashboard-banner">
            <span>✦</span>
            <div>
              <b>오늘의 작은 선택이, 내일의 여유가 돼요.</b>
              <p>사용하지 않는 구독을 살펴보고 절약 목표를 시작하세요.</p>
            </div>
            <button className="secondary" onClick={() => navigate("savings")}>
              맞춤 절감 솔루션 →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
