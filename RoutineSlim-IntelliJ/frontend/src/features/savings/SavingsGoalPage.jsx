import { useApiResource } from "../../hooks/useApiResource";
import React, { useState } from "react";
import { request, money, today } from "../../api/apiClient";
import {
  Heading,
  Status,
  Empty,
  Stats,
  Modal,
  Field,
  FormActions,
} from "../../components/common/SharedUI";
export default function SavingsGoalPage({ navigate }) {
  const [month, setMonth] = useState(today().slice(0, 7)),
    r = useApiResource("/api/v1/goals?month=" + month),
    [form, setForm] = useState(null),
    [entry, setEntry] = useState(null);
  const d = r.data,
    goal = d?.goal;
  function open() {
    r.setError("");
    setForm(
      goal
        ? { ...goal, tasksText: (goal.tasks || []).join("\n") }
        : {
            title: "이번 달 고정비 절약",
            month,
            target: "",
            tasksText:
              "겹치는 구독 확인하기\n무료체험 종료일 확인하기\n잘 쓰지 않는 요금제 검토하기",
          },
    );
  }
  async function save(e) {
    e.preventDefault();
    await r.run(async () => {
      const tasks = form.tasksText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      await request("/api/v1/goals" + (form.id ? "/" + form.id : ""), {
        method: form.id ? "PUT" : "POST",
        body: {
          title: form.title,
          month: form.month,
          target: Number(form.target),
          tasks,
          completed: tasks.map((task) => {
            const index = goal?.tasks?.indexOf(task) ?? -1;
            return index >= 0 ? Boolean(goal.completed?.[index]) : false;
          }),
        },
      });
      setForm(null);
      if (form.month !== month) setMonth(form.month);
      else await r.reload();
    });
  }
  async function add(e) {
    e.preventDefault();
    await r.run(async () => {
      await request(`/api/v1/goals/${goal.id}/savings`, {
        method: "POST",
        body: { ...entry, amount: Number(entry.amount) },
      });
      setEntry(null);
      await r.reload();
    });
  }
  async function toggle(i) {
    await r.run(async () => {
      const completed = (goal.tasks || []).map((_, index) =>
        index === i
          ? !goal.completed?.[index]
          : Boolean(goal.completed?.[index]),
      );
      await request("/api/v1/goals/" + goal.id, {
        method: "PUT",
        body: { ...goal, completed },
      });
      await r.reload();
    });
  }
  async function removeEntry(id) {
    if (!confirm("절약 기록을 삭제할까요?")) return;
    await r.run(async () => {
      await request("/api/v1/savings-entries/" + id, { method: "DELETE" });
      await r.reload();
    });
  }
  async function deleteGoal() {
    if (!confirm("이 목표와 연결된 절약 내역을 모두 삭제할까요?")) return;
    await r.run(async () => {
      await request("/api/v1/goals/" + goal.id, { method: "DELETE" });
      await r.reload();
    });
  }
  return (
    <section className="feature-page">
      <Heading
        title="절약 목표 · 챌린지"
        description="작은 목표부터 시작해 나만의 절약 습관을 만들어보세요."
      >
        <input
          aria-label="목표 월"
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
        <button className="primary" onClick={open}>
          {goal ? "목표 수정" : "목표 만들기"}
        </button>
      </Heading>
      <Status resource={r} />
      {goal ? (
        <>
          <Stats
            items={[
              ["이번 달 절약 목표", money(goal.target)],
              ["기록한 절약 금액", money(d.saved)],
              ["목표 달성률", d.percent + "%"],
            ]}
          />
          <div className="feature-split">
            <div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>{goal.title}</h2>
                  <button
                    className="danger small"
                    disabled={r.busy}
                    onClick={deleteGoal}
                  >
                    목표 삭제
                  </button>
                </div>
                <div className="feature-goal-total">
                  {money(d.saved)} <small>/ {money(goal.target)}</small>
                </div>
                <progress
                  className="budget-progress"
                  max={goal.target}
                  value={Math.min(goal.target, d.saved)}
                />
                <p className="muted">
                  목표까지 {money(Math.max(0, goal.target - d.saved))}{" "}
                  남았습니다.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    r.setError("");
                    setEntry({
                      title: "",
                      amount: "",
                      date:
                        month === today().slice(0, 7) ? today() : month + "-01",
                    });
                  }}
                >
                  ＋ 절약 내역 기록
                </button>
              </section>
              <section className="panel">
                <h2>이번 달 작은 실천</h2>
                {(goal.tasks || []).length ? (
                  goal.tasks.map((task, i) => (
                    <label className="feature-task" key={i}>
                      <input
                        type="checkbox"
                        disabled={r.busy}
                        checked={Boolean(goal.completed?.[i])}
                        onChange={() => toggle(i)}
                      />
                      <span>{task}</span>
                    </label>
                  ))
                ) : (
                  <Empty>목표 수정에서 실천 항목을 추가해주세요.</Empty>
                )}
              </section>
            </div>
            <aside>
              <section className="panel">
                <h2>절약 내역</h2>
                {d.entries.length ? (
                  d.entries.map((x) => (
                    <div className="feature-row" key={x.id}>
                      <div className="feature-grow">
                        <b>{x.title}</b>
                        <p>{x.date}</p>
                      </div>
                      <strong>{money(x.amount)}</strong>
                      <button
                        className="danger small"
                        disabled={r.busy}
                        onClick={() => removeEntry(x.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty>직접 확인한 절약 내역을 기록해주세요.</Empty>
                )}
              </section>
              <section className="panel">
                <h2>다음으로 확인해보세요</h2>
                <p className="muted">
                  다가오는 무료체험 종료일부터 확인해볼까요?
                </p>
                <button
                  className="secondary"
                  onClick={() => navigate("trials")}
                >
                  무료체험 관리 →
                </button>
              </section>
            </aside>
          </div>
        </>
      ) : (
        !r.loading && (
          <div className="panel">
            <Empty>이번 달의 절약 목표를 만들어보세요.</Empty>
          </div>
        )
      )}
      {form && (
        <Modal
          title="절약 목표 설정"
          error={r.error}
          onClose={() => !r.busy && setForm(null)}
        >
          <form onSubmit={save} className="feature-form">
            <Field label="목표 이름">
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="목표 월">
              <input
                required
                type="month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
              />
            </Field>
            <Field label="절약 목표 금액">
              <input
                required
                type="number"
                min="1"
                max="1000000000"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              />
            </Field>
            <Field label="실천 항목 (한 줄에 하나, 최대 20개)">
              <textarea
                maxLength={2400}
                rows={5}
                value={form.tasksText}
                onChange={(e) =>
                  setForm({ ...form, tasksText: e.target.value })
                }
              />
            </Field>
            <FormActions busy={r.busy} onCancel={() => setForm(null)} />
          </form>
        </Modal>
      )}
      {entry && (
        <Modal
          title="절약 내역 기록"
          error={r.error}
          onClose={() => !r.busy && setEntry(null)}
        >
          <form onSubmit={add} className="feature-form">
            <Field label="절약한 내용">
              <input
                required
                maxLength={120}
                value={entry.title}
                onChange={(e) => setEntry({ ...entry, title: e.target.value })}
              />
            </Field>
            <Field label="절약 금액">
              <input
                required
                type="number"
                min="1"
                max="1000000000"
                value={entry.amount}
                onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
              />
            </Field>
            <Field label="기록 날짜">
              <input
                required
                type="date"
                value={entry.date}
                onChange={(e) => setEntry({ ...entry, date: e.target.value })}
              />
            </Field>
            <FormActions
              busy={r.busy}
              onCancel={() => setEntry(null)}
              label="기록하기"
            />
          </form>
        </Modal>
      )}
    </section>
  );
}
