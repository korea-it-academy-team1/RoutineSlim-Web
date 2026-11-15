import * as subscriptionsApi from "../api/subscriptionsApi";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import React, { useEffect, useState } from "react";
import { formatWon } from "../../../shared/lib/format";
import { Heading, Status, Stats, Empty } from "../../../shared/components/PagePrimitives";
import { dateText } from "../../../shared/lib/format";
export default function SubscriptionDetailPage({ id, navigate }) {
  const resource = useApiResource(subscriptionsApi.getDetailPath(id)),
    [note, setNote] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (resource.data) setNote(resource.data.note);
  }, [resource.data]);
  const resourceData = resource.data,
    s = resourceData?.subscription;
  async function save(e) {
    e.preventDefault();
    await resource.run(async () => {
      await subscriptionsApi.saveSubscriptionNote(id, note);
      setSaved(true);
    });
  }
  return (
    <section className="feature-page">
      <Heading
        title={s?.name || "구독 상세"}
        description="서비스별 결제 내역과 관리 기록을 확인하세요."
      >
        <button className="secondary" onClick={() => navigate("subscriptions")}>
          ← 구독 목록
        </button>
      </Heading>
      <Status resource={resource} />
      {resourceData && (
        <>
          <Stats
            items={[
              [
                "정기 결제 금액",
                formatWon(s.amount),
                s.cycle === "weekly" ? "매주" : s.cycle === "yearly" ? "매년" : "매월",
              ],
              [
                resourceData.paymentLimit ? "최근 기록 지출" : "누적 기록 지출",
                formatWon(resourceData.totalPaid),
                resourceData.paymentLimit ? "최근 최대 24건 기준" : "직접 기록한 연결 결제 기준",
              ],
              ["결제 기록", resourceData.payments.length + "건"],
            ]}
          />
          <div className="feature-split">
            <section className="panel">
              <h2>실제 결제 내역</h2>
              {resourceData.paymentLimit && (
                <p className="muted">
                  최근 최대 24건을 표시합니다. 전체 누적 지출과 다를 수 있습니다.
                </p>
              )}
              {resourceData.payments.length ? (
                resourceData.payments.map((x) => (
                  <div className="feature-row" key={x.id}>
                    <div className="feature-grow">
                      <b>{x.description}</b>
                      <p>{dateText(x.paidOn)}</p>
                    </div>
                    <strong>{formatWon(x.amount)}</strong>
                  </div>
                ))
              ) : (
                <Empty>
                  연결된 결제 기록이 없습니다. 실제 결제 내역 화면에서 이 구독을 선택해
                  기록해주세요.
                </Empty>
              )}
              <button className="secondary" onClick={() => navigate("payments")}>
                실제 결제 기록 →
              </button>
              <h2 style={{ marginTop: 24 }}>요금·정보 변경 기록</h2>
              {resourceData.changes.length ? (
                resourceData.changes.map((x) => (
                  <div className="feature-timeline" key={x.id}>
                    <b>
                      {x.action === "REGISTER"
                        ? "구독 등록"
                        : x.action === "DELETE"
                          ? "구독 삭제"
                          : "정보 변경"}
                    </b>
                    <p>
                      {dateText(x.createdAt)} · {x.before ? formatWon(x.before.amount) + " → " : ""}
                      {formatWon(x.after?.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <Empty>
                  {resourceData.changesSupported === false
                    ? "현재 서버는 변경 이력 조회를 지원하지 않습니다."
                    : "이 버전 이후의 변경 내역부터 기록합니다."}
                </Empty>
              )}
            </section>
            <aside>
              <section className="panel">
                <h2>구독 정보</h2>
                <p className="muted">카테고리: {s.category}</p>
                <p className="muted">
                  관리 상태: {s.status === "active" ? "사용 중" : "절약 검토"}
                </p>
                <p className="muted">결제일: {s.day}일</p>
                <p className="muted">기준일: {s.billingAnchorDate || "미설정"}</p>
              </section>
              <section className="panel">
                <h2>관리 메모</h2>
                <form onSubmit={save} className="feature-form">
                  <textarea
                    aria-label="구독 관리 메모"
                    maxLength={5000}
                    rows={6}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="이용 목적이나 해지 확인 내용을 기록하세요."
                  />
                  <button className="primary" disabled={resource.busy}>
                    메모 저장
                  </button>
                  {saved && <p role="status">메모를 저장했습니다.</p>}
                </form>
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
