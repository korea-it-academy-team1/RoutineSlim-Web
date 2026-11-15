import { isRecentUsageCheck, isUsageReviewCandidate } from "../utils/usageReview";
import { useUsageChecks } from "../hooks/useUsageChecks";
import { usageLevels } from "../utils/usageLevels";
import "../styles/usageReview.css";
import React, { useState } from "react";
import { formatWon, getTodayDate } from "../../../shared/lib/format";
import { monthlyAmount } from "../../../shared/lib/monthlyAmount";
import ServiceBadge from "../../subscriptions/components/ServiceBadge";
export default function UsageCheckPanel({
  navigate = (page) => {
    window.location.hash = page;
  },
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const {
    items,
    loading,
    loadFailed,
    saving,
    pendingLevel,
    error,
    message,
    reload: load,
    save,
  } = useUsageChecks(open);
  const today = getTodayDate();
  const recent = (item) => isRecentUsageCheck(item, today);
  const lowUsage = (item) => isUsageReviewCandidate(item, today);
  const checked = items.filter(recent).length,
    candidates = items.filter(lowUsage);
  const monthly = candidates.reduce((sum, item) => sum + monthlyAmount(item), 0);
  const unavailable = loadFailed || items.some((item) => item.usageAvailable === false);
  const visible = items.filter(
    (item) => filter === "all" || (filter === "unchecked" ? !recent(item) : lowUsage(item)),
  );
  return (
    <section className="panel usage-board" aria-label="구독 사용량 점검">
      <header className="usage-board-heading">
        <div className="usage-board-intro">
          <span className="usage-heading-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M4 19V5m0 14h16M8 15v-4m5 4V7m5 8v-6" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <span className="usage-eyebrow">MY SUBSCRIPTIONS</span>
            <h2>사용량 점검</h2>
            <p>지금도 잘 쓰고 있나요? 내 구독을 가볍게 돌아보세요.</p>
          </div>
        </div>
        <button
          type="button"
          className="secondary usage-expand"
          aria-expanded={open}
          aria-controls="my-usage-check"
          disabled={saving !== null}
          onClick={() => setOpen(!open)}
        >
          {open ? "점검 접기" : "사용량 점검 시작"}
          <span aria-hidden="true">{open ? "⌃" : "↗"}</span>
        </button>
      </header>
      {open && (
        <div id="my-usage-check">
          {loading && <p role="status">구독과 사용량을 불러오는 중...</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="usage-feedback" role="status" aria-live="polite">
            {message ||
              (saving ? "사용 정도를 저장하고 있어요..." : "사용 정도를 누르면 바로 저장됩니다.")}
          </div>
          {!loading && (
            <>
              <div className="usage-overview">
                <div className="usage-overview-copy">
                  <span className="usage-eyebrow">최근 30일 점검 기준</span>
                  <h3>
                    {unavailable ? (
                      "사용량 정보를 다시 확인해주세요"
                    ) : candidates.length ? (
                      <>
                        <em>{candidates.length}개 구독</em>을 거의 쓰지 않고 있어요
                      </>
                    ) : checked ? (
                      "잘 쓰고 있는 구독을 확인했어요"
                    ) : (
                      "첫 사용량 점검을 시작해보세요"
                    )}
                  </h3>
                  <p>
                    {unavailable ? (
                      "다시 불러오기로 점검 현황을 확인할 수 있어요."
                    ) : candidates.length ? (
                      <>
                        매월 환산 <strong>{formatWon(monthly)}</strong>의 구독료를 검토해보세요.
                      </>
                    ) : (
                      "사용 빈도를 확인하면 나에게 필요한 구독이 더 선명해져요."
                    )}
                  </p>
                  <small>
                    직접 선택한 사용 정도를 기준으로 하며 자동 사용 기록은 수집하지 않습니다.
                  </small>
                </div>
                <div className="usage-progress-card">
                  <span>이번 점검 현황</span>
                  <strong>
                    {unavailable ? "—" : checked}
                    <small> / {items.length}개</small>
                  </strong>
                  <progress
                    aria-label="최근 30일 구독 점검률"
                    max={Math.max(items.length, 1)}
                    value={unavailable ? 0 : checked}
                  />
                  <p>
                    {unavailable
                      ? "사용량 조회 확인 필요"
                      : items.length
                        ? `${items.length - checked}개 구독을 더 확인해보세요`
                        : "등록한 구독이 없습니다"}
                  </p>
                </div>
              </div>
              <div className="usage-list-heading">
                <div>
                  <h3>
                    구독별 사용 정도 <span>{items.length}개</span>
                  </h3>
                  <p>최근 30일 동안 얼마나 자주 사용했나요?</p>
                </div>
                <button
                  type="button"
                  className="secondary small"
                  disabled={saving !== null}
                  onClick={load}
                >
                  다시 불러오기
                </button>
              </div>
              <div className="usage-filters" aria-label="사용량 점검 필터">
                {[
                  ["all", "전체", items.length],
                  ["unchecked", "점검 필요", items.filter((s) => !recent(s)).length],
                  ["review", "절약 검토", candidates.length],
                ].map(([key, label, count]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                    <span>{unavailable && key !== "all" ? "—" : count}</span>
                  </button>
                ))}
              </div>
              {!items.length && !error && (
                <p className="usage-empty">
                  점검할 구독이 없습니다. 구독 관리에서 먼저 등록해주세요.
                </p>
              )}
              {items.length > 0 && !visible.length && (
                <p className="usage-empty">이 조건에 해당하는 구독이 없습니다.</p>
              )}
              <div className="usage-cards">
                {visible.map((item) => (
                  <article
                    className={"usage-card" + (lowUsage(item) ? " is-review" : "")}
                    key={item.id}
                  >
                    <div className="usage-card-top">
                      <ServiceBadge name={item.name} />
                      <div className="usage-card-service">
                        <h4>{item.name}</h4>
                        <p>
                          {item.usageAvailable === false
                            ? "점검 정보 확인 필요"
                            : item.usageCheckedOn
                              ? `${item.usageCheckedOn} 점검${recent(item) ? "" : " · 재점검 필요"}`
                              : "아직 점검하지 않음"}
                        </p>
                      </div>
                      <div className="usage-card-cost">
                        <strong>{formatWon(monthlyAmount(item))}</strong>
                        <small>월 환산</small>
                      </div>
                    </div>
                    <div
                      className="usage-levels"
                      role="group"
                      aria-label={`${item.name} 사용 정도`}
                    >
                      {Object.entries(usageLevels).map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          aria-label={`${item.name} ${label}`}
                          aria-pressed={
                            (saving === item.id ? pendingLevel : item.usageLevel) === key
                          }
                          disabled={saving !== null || item.usageAvailable === false}
                          onClick={() => {
                            if (item.usageLevel !== key || !recent(item)) save(item, key);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="usage-card-footer">
                      <span>
                        {saving === item.id
                          ? "저장 중..."
                          : lowUsage(item)
                            ? "절약 검토 후보"
                            : recent(item)
                              ? "점검 완료"
                              : "내 사용 패턴을 선택해주세요"}
                      </span>
                      {item.status === "paused" && <small>일시정지 중</small>}
                    </div>
                  </article>
                ))}
              </div>
              <footer className="usage-bottom">
                <div>
                  <strong>
                    {candidates.length
                      ? `정리 후보 ${candidates.length}개를 발견했어요`
                      : "점검한 내용을 절약 분석에서 확인하세요"}
                  </strong>
                  <p>구독 변경과 실제 해지는 해당 서비스에서 진행해주세요.</p>
                </div>
                <button type="button" className="primary" onClick={() => navigate("savings")}>
                  {candidates.length
                    ? `정리 후보 ${candidates.length}개 살펴보기`
                    : "맞춤 절약 분석 보기"}
                  <span aria-hidden="true"> →</span>
                </button>
              </footer>
            </>
          )}
        </div>
      )}
    </section>
  );
}
