import React, { useEffect, useState } from "react";
import { request, today } from "../../../api/apiClient";
import { Modal } from "../../../components/common/SharedUI";
import ServiceBadge from "../../../components/common/ServiceBadge";
export default function SubscriptionEditor({
  subscription = null,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => ({
      name: "",
      category: "영상",
      amount: "",
      cycle: "monthly",
      day: 1,
      status: "active",
      billingAnchorDate: today(),
      ...subscription,
    })),
    [catalog, setCatalog] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    request("/api/v1/catalog")
      .then((rows) => {
        if (active) setCatalog(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const chosen = catalog.find((x) => x.name === form.name),
    categories = [
      ...new Set([
        form.category,
        "영상",
        "OTT/영상",
        "음악",
        "멤버십",
        "생산성",
        "통신",
        "주거/생활",
        "생활/기타",
        "기타",
      ]),
    ];
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await request(
        "/api/v1/subscriptions" + (subscription ? "/" + subscription.id : ""),
        {
          method: subscription ? "PUT" : "POST",
          body: {
            name: form.name.trim(),
            category: form.category,
            amount: Number(form.amount),
            cycle: form.cycle,
            day: Number(form.day),
            status: form.status,
            billingAnchorDate: form.billingAnchorDate,
          },
        },
      );
      window.dispatchEvent(new Event("routineslim:subscriptions"));
      onSaved(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={subscription ? "고정비 수정" : "고정비 추가"}
      error={error}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="form-grid subscription-editor" onSubmit={save}>
        <label className="editor-wide">
          서비스 빠른 선택 · 아이콘/카테고리 자동 설정
          <select
            aria-label="서비스 빠른 선택"
            value={chosen?.name || ""}
            disabled={busy}
            onChange={(e) => {
              const service = catalog.find((x) => x.name === e.target.value);
              if (service)
                setForm({
                  ...form,
                  name: service.name,
                  category: service.category,
                });
              else setForm({ ...form, name: "" });
            }}
          >
            <option value="">직접 입력 / 서비스 선택</option>
            <optgroup label="추천 서비스">
              {catalog.map((x) => (
                <option key={x.name} value={x.name}>
                  {x.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="editor-wide">
          항목 이름
          <input
            required
            maxLength={255}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="service-preview editor-wide">
          <ServiceBadge
            name={form.name}
            icon={chosen?.icon}
            background={chosen?.background}
          />
          <span>
            <b>{form.name || "직접 입력한 고정비"}</b>
            <small>
              {form.category} · 금액은 실제 결제 조건에 맞게 입력해주세요.
            </small>
          </span>
        </div>
        <label>
          카테고리
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          결제 금액 (원)
          <input
            type="number"
            min="0"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label>
          결제 주기
          <select
            value={form.cycle}
            onChange={(e) => setForm({ ...form, cycle: e.target.value })}
          >
            <option value="monthly">매월</option>
            <option value="yearly">매년</option>
            <option value="weekly">매주</option>
          </select>
        </label>
        <label>
          결제일 (1~31)
          <input
            required
            type="number"
            min="1"
            max="31"
            value={form.day}
            onChange={(e) => setForm({ ...form, day: e.target.value })}
          />
        </label>
        <label>
          기준일
          <input
            required
            type="date"
            value={form.billingAnchorDate || today()}
            onChange={(e) =>
              setForm({ ...form, billingAnchorDate: e.target.value })
            }
          />
        </label>
        <label>
          상태
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">이용 중</option>
            <option value="review">절약 검토</option>
          </select>
        </label>
        <div className="feature-form-actions editor-wide">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
