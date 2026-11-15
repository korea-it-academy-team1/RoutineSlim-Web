import { getApiConfig } from "../../../shared/api/apiConfig";
import { planPrice, filterPlans, safeSourceUrl } from "../utils/planComparison";
import { exportCsv } from "../../../shared/lib/csvExport";
import * as subscriptionsApi from "../api/subscriptionsApi";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import React, { useEffect, useState } from "react";
import { formatWon } from "../../../shared/lib/format";
import { Heading, Status, Empty, Tabs } from "../../../shared/components/PagePrimitives";
export default function SubscriptionComparisonPage() {
  const localMode = getApiConfig().mode === "server-dev";
  const resource = useApiResource(subscriptionsApi.getComparisonPlansPath()),
    [category, setCategory] = useState("전체"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("default"),
    [selected, setSelected] = useState([]),
    [saved, setSaved] = useState(false),
    [selectionReady, setSelectionReady] = useState(false);
  useEffect(() => {
    subscriptionsApi
      .getComparisonSelection()
      .then((value) => {
        setSelected(value.map((x) => x.id));
        setSelectionReady(true);
      })
      .catch((e) => resource.setError(e.message));
  }, []);
  useEffect(() => {
    if (!selectionReady || !Array.isArray(resource.data)) return;
    setSelected((ids) => ids.filter((id) => resource.data.some((plan) => plan.id === id)));
  }, [resource.data, selectionReady]);
  const plans = resource.data || [],
    categories = ["전체", ...new Set(plans.map((x) => x.category))],
    visible = filterPlans(plans, category, query, sort),
    choices = plans.filter((x) => selected.includes(x.id));
  const priced = choices.map((x) => planPrice(x)?.monthly).filter((x) => x != null);
  const cheapest = priced.length ? Math.min(...priced) : null;
  const difference = priced.length > 1 ? Math.max(...priced) - cheapest : 0;
  const priceLabel = (plan, key) => {
    const price = planPrice(plan);
    return price ? formatWon(price[key]) : "요금 정보 확인 필요";
  };
  function toggle(id) {
    setSaved(false);
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((x) => x !== id)
        : previous.length < 3
          ? [...previous, id]
          : previous,
    );
  }
  async function save() {
    if (!selectionReady || resource.loading || resource.error) return;
    await resource.run(async () => {
      await subscriptionsApi.saveComparisonSelection(selected, plans);
      setSaved(true);
    });
  }
  return (
    <section className="feature-page">
      <Heading
        title="구독 비교"
        description={
          localMode
            ? "내가 등록한 구독을 최대 3개까지 비교하세요. 비교 선택은 이 브라우저에만 저장됩니다."
            : "등록된 요금제의 조건과 출처를 확인하고 최대 3개까지 비교하세요."
        }
      >
        <button
          className="primary"
          disabled={resource.busy || resource.loading || !selectionReady || Boolean(resource.error)}
          onClick={save}
        >
          선택 저장
        </button>
      </Heading>
      <Status resource={resource} />
      {saved && (
        <p className="feature-note" role="status">
          {localMode
            ? "비교 선택을 이 브라우저에 저장했습니다."
            : "비교 선택을 계정에 저장했습니다."}
        </p>
      )}
      <div className="panel tools-toolbar">
        <label>
          요금제 검색{" "}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="서비스·요금제·제공 조건"
          />
        </label>
        <label>
          정렬{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">기본 순</option>
            <option value="price-asc">월 환산 금액 낮은 순</option>
            <option value="price-desc">월 환산 금액 높은 순</option>
            <option value="name">이름 순</option>
          </select>
        </label>
        <span role="status">
          검색 결과 {visible.length}개 · 비교 선택 {choices.length}/3
        </span>
        <button
          className="secondary small"
          disabled={!choices.length}
          onClick={() => {
            setSelected([]);
            setSaved(false);
          }}
        >
          비교 선택 초기화
        </button>
      </div>
      <Tabs values={categories.map((x) => [x, x])} value={category} onChange={setCategory} />
      {!plans.length && !resource.loading ? (
        <div className="panel">
          <Empty>
            {localMode
              ? "먼저 구독 관리에서 구독을 등록해주세요."
              : "등록된 요금제가 없습니다. 관리자가 요금과 출처를 등록하면 비교할 수 있습니다."}
          </Empty>
        </div>
      ) : (
        <div className="feature-plan-grid">
          {visible.map((x) => (
            <article
              className={"panel feature-plan " + (selected.includes(x.id) ? "selected" : "")}
              key={x.id}
            >
              <p className="muted">
                {x.service} · {x.category}
              </p>
              <h2>{x.plan}</h2>
              <strong className="feature-price">
                {planPrice(x) ? formatWon(x.amount) : "요금 정보 없음"}{" "}
                <small>
                  /{(x.cycleInterval || 1) > 1 ? `${x.cycleInterval}` : ""}
                  {{ weekly: "주", yearly: "년", monthly: "월" }[x.cycle] || "주기 확인"}
                </small>
              </strong>
              <p className="muted">월 환산 {priceLabel(x, "monthly")}</p>
              <ul>
                {(x.features || []).map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
              <p className="muted">정보 수정일 {x.updatedAt?.slice(0, 10) || "정보 없음"}</p>
              {safeSourceUrl(x.sourceUrl) && (
                <a href={safeSourceUrl(x.sourceUrl)} target="_blank" rel="noopener noreferrer">
                  제공 업체 출처 확인 ↗
                </a>
              )}
              <button
                className={selected.includes(x.id) ? "primary" : "secondary"}
                aria-pressed={selected.includes(x.id)}
                disabled={
                  !selectionReady ||
                  resource.busy ||
                  (!selected.includes(x.id) && selected.length >= 3)
                }
                onClick={() => toggle(x.id)}
              >
                {selected.includes(x.id) ? "선택 해제" : "비교에 추가"}
              </button>
            </article>
          ))}
        </div>
      )}
      {plans.length > 0 && !visible.length && !resource.loading && (
        <div className="panel">
          <Empty>검색 조건에 맞는 요금제가 없습니다.</Empty>
        </div>
      )}
      {choices.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <h2>선택한 요금제 비교</h2>
            <button
              className="secondary small"
              onClick={() => {
                try {
                  exportCsv(
                    "RoutineSlim-요금제-비교.csv",
                    ["서비스", "요금제", "월 환산", "연 환산", "제공 조건", "출처"],
                    choices.map((x) => [
                      x.service,
                      x.plan,
                      planPrice(x)?.monthly ?? "",
                      planPrice(x)?.annual ?? "",
                      (x.features || []).join(" · "),
                      safeSourceUrl(x.sourceUrl) || "",
                    ]),
                  );
                } catch {
                  resource.setError("비교 파일을 내보내지 못했습니다.");
                }
              }}
            >
              비교표 CSV 내보내기
            </button>
          </div>
          {priced.length > 1 && (
            <p className="feature-note">
              선택 요금제의 월 환산 최대 차이: <strong>{formatWon(difference)}</strong>. 제공 조건도
              함께 확인하세요.
            </p>
          )}
          <div className="feature-table-wrap">
            <table className="feature-table">
              <thead>
                <tr>
                  <th>항목</th>
                  {choices.map((x) => (
                    <th key={x.id}>
                      {x.service}
                      <br />
                      {x.plan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>월 환산</th>
                  {choices.map((x) => (
                    <td
                      key={x.id}
                      className={planPrice(x)?.monthly === cheapest ? "comparison-cheapest" : ""}
                    >
                      {priceLabel(x, "monthly")}
                      {planPrice(x)?.monthly === cheapest && <small>선택 요금제 중 최저</small>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>연 환산</th>
                  {choices.map((x) => (
                    <td key={x.id}>{priceLabel(x, "annual")}</td>
                  ))}
                </tr>
                <tr>
                  <th>제공 조건</th>
                  {choices.map((x) => (
                    <td key={x.id}>{(x.features || []).join(" · ") || "정보 없음"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted">
            월·연 환산은 주간 결제 연 52회와 등록된 결제 간격을 기준으로 계산합니다. 실제 청구액과
            다를 수 있습니다.{" "}
            {localMode
              ? "직접 등록한 구독 금액을 기준으로 비교합니다."
              : "관리자가 등록한 정보입니다."}{" "}
            실제 가입 전 제공 업체의 최신 요금과 조건을 확인해주세요.
          </p>
        </section>
      )}
    </section>
  );
}
