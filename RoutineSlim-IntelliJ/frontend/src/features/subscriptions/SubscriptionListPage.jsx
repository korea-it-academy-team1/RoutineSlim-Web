import React, { useEffect, useState } from "react";
import { request, money } from "../../api/apiClient";
import { exportCsv } from "../../utils/csvExport";
import ServiceBadge from "../../components/common/ServiceBadge";
import SubscriptionEditor from "./components/SubscriptionEditor";
import { monthlyAmount } from "../../utils/subscriptionCalculations";
export default function SubscriptionListPage({ onDetails }) {
  const [items, setItems] = useState([]),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("전체"),
    [status, setStatus] = useState("전체"),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    request("/api/v1/subscriptions")
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function remove(id) {
    if (busy || !confirm("이 구독을 삭제할까요? 실제 결제 내역은 보존됩니다."))
      return;
    setBusy(true);
    setError("");
    try {
      await request("/api/v1/subscriptions/" + id, { method: "DELETE" });
      setItems((rows) => rows.filter((x) => x.id !== id));
      window.dispatchEvent(new Event("routineslim:subscriptions"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter(
    (x) =>
      (category === "전체" || x.category === category) &&
      (status === "전체" || x.status === status) &&
      x.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section>
      <div className="heading dashboard-heading">
        <div>
          <h1>구독 관리</h1>
          <p>구독 서비스와 매달 반복되는 고정비를 한곳에서 관리하세요.</p>
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
      <section className="panel">
        <div className="panel-heading">
          <h2>
            등록된 구독 <span className="count-chip">{items.length}</span>
          </h2>
          <button
            className="secondary small"
            disabled={!items.length}
            onClick={() =>
              exportCsv(
                "routineslim-subscriptions.csv",
                ["서비스", "카테고리", "금액", "주기", "결제일", "상태"],
                items.map((x) => [
                  x.name,
                  x.category,
                  x.amount,
                  x.cycle,
                  x.billingAnchorDate || x.day,
                  x.status,
                ]),
              )
            }
          >
            CSV 내보내기
          </button>
        </div>
        <div className="table-toolbar">
          <input
            aria-label="구독 검색"
            placeholder="항목 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="구독 카테고리 필터"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["전체", ...new Set(items.map((x) => x.category))].map((x) => (
              <option key={x} value={x}>
                {x === "전체" ? "모든 카테고리" : x}
              </option>
            ))}
          </select>
          <select
            aria-label="구독 상태 필터"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="전체">모든 상태</option>
            <option value="active">이용 중</option>
            <option value="review">절약 검토</option>
          </select>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>카테고리</th>
                <th>주기</th>
                <th>금액</th>
                <th>결제일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => (
                <tr key={x.id}>
                  <td>
                    <span className="service-name">
                      <ServiceBadge name={x.name} />
                      <b>{x.name}</b>
                    </span>
                  </td>
                  <td>{x.category}</td>
                  <td>
                    {x.cycle === "yearly"
                      ? "매년"
                      : x.cycle === "weekly"
                        ? "매주"
                        : "매월"}
                  </td>
                  <td>
                    <b>{money(x.amount)}</b>
                    <small className="amount-caption">
                      월 환산 {money(Math.round(monthlyAmount(x)))}
                    </small>
                  </td>
                  <td>
                    {x.cycle === "monthly"
                      ? `매월 ${x.day}일`
                      : x.billingAnchorDate || "기준일 없음"}
                  </td>
                  <td>
                    <span className={"status-pill " + x.status}>
                      {x.status === "review" ? "절약 검토" : "이용 중"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      {onDetails && (
                        <button
                          className="secondary small"
                          onClick={() => onDetails(x.id)}
                        >
                          상세
                        </button>
                      )}
                      <button
                        className="secondary small"
                        onClick={() => {
                          setEditing(x);
                          setOpen(true);
                        }}
                      >
                        수정
                      </button>
                      <button
                        className="danger small"
                        disabled={busy}
                        onClick={() => remove(x.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="designed-empty">
            <p>
              {items.length
                ? "검색 조건에 맞는 고정비가 없습니다."
                : "등록된 구독이 없습니다."}
            </p>
          </div>
        )}
      </section>
      {open && (
        <SubscriptionEditor
          subscription={editing}
          onClose={() => setOpen(false)}
          onSaved={(saved) => {
            setItems((rows) =>
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
