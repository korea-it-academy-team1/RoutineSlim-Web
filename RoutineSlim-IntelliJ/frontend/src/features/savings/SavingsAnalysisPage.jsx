import React, { useEffect, useState } from "react";
import { request, money } from "../../api/apiClient";
import ServiceBadge from "../../components/common/ServiceBadge";
import CategorySpendingChart from "../../components/charts/CategorySpendingChart";
import SubscriptionEditor from "../subscriptions/components/SubscriptionEditor";
import {
  monthlyAmount,
  savingsAnalysis,
} from "../../utils/subscriptionCalculations";
export default function SavingsAnalysisPage() {
  const [subs, setSubs] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("전체 추천"),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    request("/api/v1/subscriptions")
      .then((rows) => {
        if (active) setSubs(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const analysis = savingsAnalysis(subs),
    visible = subs.filter(
      (x) =>
        filter === "전체 추천" ||
        (filter === "절약 검토" && x.status === "review") ||
        (filter === "중복 카테고리" && analysis.duplicateIds.has(x.id)) ||
        (filter === "이용 중" && x.status === "active"),
    );
  async function toggle(s) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await request("/api/v1/subscriptions/" + s.id, {
        method: "PUT",
        body: { ...s, status: s.status === "review" ? "active" : "review" },
      });
      setSubs((rows) => rows.map((x) => (x.id === updated.id ? updated : x)));
      window.dispatchEvent(new Event("routineslim:subscriptions"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const max = Math.max(1, analysis.total),
    percent = analysis.total
      ? Math.round((analysis.saved / analysis.total) * 100)
      : 0;
  return (
    <section>
      <div className="heading dashboard-heading">
        <div>
          <h1>맞춤 절약 분석</h1>
          <p>내가 등록한 구독과 사용 상태를 기준으로 절약 후보를 확인하세요.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          ＋ 고정비 추가
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="stats budget-stats">
        <article className="stat">
          <span>월 최대 절감 후보 금액</span>
          <strong>{money(Math.round(analysis.saved))}</strong>
          <small>검토 구독을 해지한다고 가정한 금액</small>
        </article>
        <article className="stat">
          <span>분석한 구독 서비스</span>
          <strong>{subs.length}개</strong>
          <small>등록한 고정비 전체 기준</small>
        </article>
        <article className="stat">
          <span>절약 검토 항목</span>
          <strong>{analysis.reviewCount}개</strong>
          <small>연간 최대 {money(Math.round(analysis.saved * 12))}</small>
        </article>
      </div>
      <div className="savings-workspace">
        <div>
          <div className="panel savings-tabs">
            {["전체 추천", "절약 검토", "중복 카테고리", "이용 중"].map((x) => (
              <button
                key={x}
                className={filter === x ? "selected" : ""}
                aria-pressed={filter === x}
                onClick={() => setFilter(x)}
              >
                {x}
              </button>
            ))}
          </div>
          <section className="panel savings-candidates">
            {visible.map((x) => (
              <article className="saving-candidate" key={x.id}>
                <ServiceBadge name={x.name} />
                <div className="candidate-info">
                  <h2>
                    {x.name}{" "}
                    {analysis.duplicateIds.has(x.id) && (
                      <small>중복 카테고리</small>
                    )}
                  </h2>
                  <p>
                    {analysis.duplicateIds.has(x.id)
                      ? "같은 카테고리 구독이 여러 개 있습니다. 실제 중복 여부를 확인해 보세요."
                      : "사용 빈도와 실제 결제 조건을 확인해 보세요."}
                  </p>
                </div>
                <div className="candidate-price">
                  <small>월 환산 요금</small>
                  <strong>{money(Math.round(monthlyAmount(x)))}</strong>
                  <b>{x.status === "review" ? "검토 중" : "검토 가능"}</b>
                </div>
                <div className="candidate-actions">
                  <button
                    className={x.status === "review" ? "secondary" : "primary"}
                    disabled={busy}
                    onClick={() => toggle(x)}
                  >
                    {x.status === "review" ? "검토 해제" : "절약 검토"}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditing(x);
                      setOpen(true);
                    }}
                  >
                    요금 정보 수정
                  </button>
                </div>
              </article>
            ))}
            {!visible.length && (
              <div className="designed-empty">
                <p>해당 조건에 맞는 구독이 없습니다.</p>
              </div>
            )}
          </section>
          <p className="muted">
            같은 카테고리라는 사실만으로 불필요한 구독이라고 판단하지 않습니다.
            실제 해지와 결제 중단은 제공 업체에서 진행해주세요.
          </p>
        </div>
        <aside>
          <section className="panel">
            <h2>구독 지출 분석</h2>
            <CategorySpendingChart entries={analysis.categories} />
          </section>
          <section className="panel">
            <h2>절감 효과 시뮬레이션</h2>
            <div
              className="savings-simulation"
              role="img"
              aria-label={`현재 월 지출 ${money(Math.round(analysis.total))}, 검토 항목 제외 시 ${money(Math.round(analysis.remaining))}`}
            >
              <div>
                <div className="simulation-track">
                  <i style={{ height: (analysis.total / max) * 100 + "%" }} />
                </div>
                <b>{money(Math.round(analysis.total))}</b>
                <small>현재 월 지출</small>
              </div>
              <div>
                <div className="simulation-track">
                  <i
                    className="after"
                    style={{ height: (analysis.remaining / max) * 100 + "%" }}
                  />
                </div>
                <b>{money(Math.round(analysis.remaining))}</b>
                <small>검토 항목 제외 시</small>
              </div>
            </div>
            <p className="savings-result">
              월 최대 {money(Math.round(analysis.saved))} 절감 후보 ({percent}%)
            </p>
            <p className="muted">예상 금액이며 실제 절약 실적은 아닙니다.</p>
          </section>
          <section className="rail-tip">
            <h2>맞춤 절감 팁</h2>
            <p>
              중복 카테고리와 사용 빈도를 먼저 점검하고, 연간 결제는 남은 기간과
              환불 조건을 확인하세요.
            </p>
          </section>
        </aside>
      </div>
      {open && (
        <SubscriptionEditor
          subscription={editing}
          onClose={() => setOpen(false)}
          onSaved={(saved) => {
            setSubs((rows) =>
              editing
                ? rows.map((x) => (x.id === saved.id ? saved : x))
                : [saved, ...rows],
            );
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
