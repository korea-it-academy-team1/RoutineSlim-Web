import MonthlySpendingChart from "../../components/charts/MonthlySpendingChart";
import CategorySpendingChart from "../../components/charts/CategorySpendingChart";
import { useApiResource } from "../../hooks/useApiResource";
import React, { useState } from "react";
import { money, today } from "../../api/apiClient";
import { exportCsv } from "../../utils/csvExport";
import {
  Heading,
  Status,
  Stats,
  Empty,
} from "../../components/common/SharedUI";
export default function MonthlyReportPage({ navigate }) {
  const [month, setMonth] = useState(today().slice(0, 7)),
    r = useApiResource("/api/v1/reports/monthly?month=" + month),
    d = r.data;
  return (
    <section className="feature-page">
      <Heading
        title="월간 결산"
        description="직접 기록한 실제 결제 내역으로 한 달의 지출을 돌아보세요."
      >
        <input
          aria-label="결산 월"
          type="month"
          required
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
        <button
          className="secondary"
          disabled={!d?.paymentCount}
          onClick={() =>
            exportCsv(
              "RoutineSlim-" + month + ".csv",
              ["카테고리", "실제 지출"],
              d.categories.map((x) => [x.category, x.amount]),
            )
          }
        >
          CSV 내보내기
        </button>
      </Heading>
      <Status resource={r} />
      {d && (
        <>
          <div className="feature-month-summary">
            <span>이번 달의 변화</span>
            <h2>
              {!d.hasPrevious
                ? "지난달 기록을 추가하면 변화를 비교할 수 있어요."
                : d.difference === 0
                  ? "지난달과 지출이 같아요."
                  : d.difference < 0
                    ? `지난달보다 ${money(-d.difference)} 줄었어요.`
                    : `지난달보다 ${money(d.difference)} 늘었어요.`}
            </h2>
            <p>실제 결제 기록 기준이며, 예상 구독료와는 다를 수 있습니다.</p>
          </div>
          <Stats
            items={[
              ["이번 달 실제 지출", money(d.total)],
              [
                "지난달 실제 지출",
                d.hasPrevious ? money(d.previousTotal) : "기록 없음",
              ],
              ["결제 기록", d.paymentCount + "건"],
            ]}
          />
          <div className="feature-split">
            <section className="panel">
              <h2>최근 6개월 실제 지출</h2>
              <MonthlySpendingChart history={d.history} />
              <p className="muted">
                결제 기록이 없는 달은 합계가 0원으로 표시됩니다.
              </p>
            </section>
            <aside>
              <section className="panel">
                <h2>카테고리별 지출</h2>
                <CategorySpendingChart entries={d.categories} />
                {d.categories.length ? (
                  d.categories.map((x) => (
                    <div className="item" key={x.category}>
                      <span>{x.category}</span>
                      <b>{money(x.amount)}</b>
                    </div>
                  ))
                ) : (
                  <Empty>이번 달 결제 기록이 없습니다.</Empty>
                )}
                <p className="muted">
                  구독과 연결되지 않은 수동 결제는 기타로 분류합니다.
                </p>
              </section>
              <section className="panel">
                <h2>다음 달도 가볍게</h2>
                <p className="muted">달성 가능한 절약 목표를 정해보세요.</p>
                <button className="secondary" onClick={() => navigate("goals")}>
                  절약 목표 세우기 →
                </button>
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
