import { useApiResource } from "../../hooks/useApiResource";
import React, { useState } from "react";
import { request, money, today } from "../../api/apiClient";
import {
  Heading,
  Status,
  Empty,
  Tabs,
  Stats,
  Modal,
  Field,
  FormActions,
} from "../../components/common/SharedUI";
export default function FreeTrialPage() {
  const r = useApiResource("/api/v1/trials"),
    [filter, setFilter] = useState("ALL"),
    [form, setForm] = useState(null);
  const items = r.data || [];
  const days = (x) =>
    Math.round(
      (new Date(x.endDate + "T00:00:00") - new Date(today() + "T00:00:00")) /
        86400000,
    );
  const active = items.filter((x) => x.status === "ACTIVE"),
    soon = active.filter((x) => days(x) >= 0 && days(x) <= 7);
  const visible = items.filter((x) => filter === "ALL" || x.status === filter);
  function open(item) {
    r.setError("");
    setForm(
      item || {
        name: "",
        category: "영상",
        endDate: today(),
        amount: "",
        notifyDays: 3,
        status: "ACTIVE",
      },
    );
  }
  async function save(e) {
    e.preventDefault();
    await r.run(async () => {
      await request("/api/v1/trials" + (form.id ? "/" + form.id : ""), {
        method: form.id ? "PUT" : "POST",
        body: {
          name: form.name,
          category: form.category,
          endDate: form.endDate,
          amount: Number(form.amount),
          notifyDays: Number(form.notifyDays),
          status: form.status,
        },
      });
      setForm(null);
      await r.reload();
    });
  }
  async function status(item) {
    await r.run(async () => {
      await request("/api/v1/trials/" + item.id, {
        method: "PUT",
        body: {
          ...item,
          status: item.status === "ACTIVE" ? "CANCELLED" : "ACTIVE",
        },
      });
      await r.reload();
    });
  }
  async function remove(item) {
    if (!confirm("이 무료체험 기록을 삭제할까요?")) return;
    await r.run(async () => {
      await request("/api/v1/trials/" + item.id, { method: "DELETE" });
      await r.reload();
    });
  }
  return (
    <section className="feature-page">
      <Heading
        title="무료체험 관리"
        description="종료일을 확인하고 원치 않는 유료 전환을 미리 준비하세요."
      >
        <button className="primary" onClick={() => open()}>
          ＋ 무료체험 등록
        </button>
      </Heading>
      <Status resource={r} />
      <Stats
        items={[
          ["진행 중인 무료체험", active.length + "개"],
          ["7일 이내 종료", soon.length + "개"],
          [
            "예상 유료 전환 금액",
            money(soon.reduce((n, x) => n + x.amount, 0)),
            "7일 이내 종료 항목 기준",
          ],
        ]}
      />
      <p className="feature-note">
        실제 해지는 해당 서비스에서 진행한 후 ‘해지 확인’을 표시해주세요. 종료
        알림은 알림센터에서 확인합니다.
      </p>
      <div className="feature-split">
        <div className="panel">
          <h2>내 무료체험</h2>
          <Tabs
            values={[
              ["ALL", "전체"],
              ["ACTIVE", "진행 중"],
              ["CANCELLED", "해지 확인"],
            ]}
            value={filter}
            onChange={setFilter}
          />
          {visible.length ? (
            visible.map((x) => (
              <div className="feature-row" key={x.id}>
                <span className="feature-service-icon">
                  {x.name.slice(0, 1)}
                </span>
                <div className="feature-grow">
                  <b>{x.name}</b>
                  <p>
                    {x.category} · {x.endDate} 종료 · {x.notifyDays}일 전 알림
                  </p>
                </div>
                <strong>{money(x.amount)}</strong>
                <span
                  className={"feature-pill " + (days(x) <= 3 ? "warning" : "")}
                >
                  {x.status === "CANCELLED"
                    ? "해지 확인"
                    : days(x) < 0
                      ? "종료일 지남"
                      : days(x) === 0
                        ? "오늘 종료"
                        : "D−" + days(x)}
                </span>
                <div className="feature-actions">
                  <button
                    className="secondary small"
                    disabled={r.busy}
                    onClick={() => open(x)}
                  >
                    수정
                  </button>
                  <button
                    className="secondary small"
                    disabled={r.busy}
                    onClick={() => status(x)}
                  >
                    {x.status === "ACTIVE" ? "해지 확인" : "진행 중으로"}
                  </button>
                  <button
                    className="danger small"
                    disabled={r.busy}
                    onClick={() => remove(x)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          ) : (
            <Empty>무료체험을 등록하면 종료 일정이 표시됩니다.</Empty>
          )}
        </div>
        <aside className="panel">
          <h2>다가오는 종료일</h2>
          {soon.length ? (
            soon.map((x) => (
              <div className="feature-timeline" key={x.id}>
                <b>{x.endDate}</b>
                <p>
                  {x.name} · {money(x.amount)}
                </p>
              </div>
            ))
          ) : (
            <Empty>7일 이내 종료되는 무료체험이 없습니다.</Empty>
          )}
        </aside>
      </div>
      {form && (
        <Modal
          title={form.id ? "무료체험 수정" : "무료체험 등록"}
          error={r.error}
          onClose={() => !r.busy && setForm(null)}
        >
          <form onSubmit={save} className="feature-form">
            <Field label="서비스 이름">
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="카테고리">
              <input
                required
                maxLength={40}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
            <Field label="무료체험 종료일">
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>
            <Field label="전환 후 결제 금액 (원)">
              <input
                required
                type="number"
                min="0"
                max="1000000000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <Field label="종료 며칠 전부터 알림">
              <input
                required
                type="number"
                min="0"
                max="30"
                value={form.notifyDays}
                onChange={(e) =>
                  setForm({ ...form, notifyDays: e.target.value })
                }
              />
            </Field>
            <FormActions busy={r.busy} onCancel={() => setForm(null)} />
          </form>
        </Modal>
      )}
    </section>
  );
}
