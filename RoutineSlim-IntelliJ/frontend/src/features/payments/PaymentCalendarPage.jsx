import React, { useEffect, useState } from "react";
import { request, money, today } from "../../api/apiClient";
export default function PaymentCalendarPage() {
  const [month, setMonth] = useState(today().slice(0, 7)),
    [events, setEvents] = useState([]),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setEvents([]);
    setSelected(null);
    const [year, m] = month.split("-");
    request(`/api/v1/calendar/events?year=${year}&month=${Number(m)}`)
      .then((value) => {
        if (active) {
          setEvents(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);
  const [year, m] = month.split("-").map(Number),
    offset = new Date(year, m - 1, 1).getDay(),
    days = new Date(year, m, 0).getDate(),
    shown = selected ? events.filter((x) => x.date === selected) : events;
  function shift(amount) {
    const date = new Date(year, m - 1 + amount, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return (
    <section>
      <div className="heading">
        <h1>결제 캘린더</h1>
        <p>예정된 정기 결제 일정을 월별로 확인하세요.</p>
      </div>
      <div className="stats budget-stats">
        <article className="stat">
          <span>선택 월 예상 결제</span>
          <strong>{money(events.reduce((sum, x) => sum + x.amount, 0))}</strong>
        </article>
        <article className="stat">
          <span>결제 일정</span>
          <strong>{events.length}건</strong>
        </article>
        <article className="stat">
          <span>결제 예정일</span>
          <strong>{new Set(events.map((x) => x.date)).size}일</strong>
        </article>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            {year}년 {m}월
          </h2>
          <div className="table-actions">
            <button
              className="secondary small"
              aria-label="이전 달"
              onClick={() => shift(-1)}
            >
              ‹
            </button>
            <input
              aria-label="조회 월"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
            <button
              className="secondary small"
              aria-label="다음 달"
              onClick={() => shift(1)}
            >
              ›
            </button>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="month-calendar">
          {["일", "월", "화", "수", "목", "금", "토"].map((x) => (
            <b className="weekday" key={x}>
              {x}
            </b>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="calendar-blank" key={"blank" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1,
              date = `${month}-${String(day).padStart(2, "0")}`,
              items = events.filter((x) => x.date === date);
            return (
              <button
                key={date}
                className={
                  "calendar-day " +
                  (date === today() ? "today " : "") +
                  (date === selected ? "selected" : "")
                }
                aria-label={`${m}월 ${day}일 결제 ${items.length}건`}
                aria-pressed={selected === date}
                onClick={() => setSelected(selected === date ? null : date)}
              >
                <span>{day}</span>
                {items.slice(0, 2).map((x, k) => (
                  <small key={k}>{x.name}</small>
                ))}
                {items.length > 2 && <small>+{items.length - 2}개</small>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>{selected ? selected + " 결제 일정" : "결제 예정 목록"}</h2>
          {selected && (
            <button className="text-action" onClick={() => setSelected(null)}>
              전체 일정
            </button>
          )}
        </div>
        {loading ? (
          <p>불러오는 중...</p>
        ) : shown.length ? (
          shown.map((x, i) => (
            <div className="item" key={`${x.subscriptionId}-${x.date}-${i}`}>
              <div>
                <b>{x.name}</b>
                <p className="muted">
                  {x.date} · {x.category}
                </p>
              </div>
              <strong>{money(x.amount)}</strong>
            </div>
          ))
        ) : (
          <p className="muted">
            선택한 {selected ? "날짜" : "달"}의 결제 예정 항목이 없습니다.
          </p>
        )}
      </section>
    </section>
  );
}
