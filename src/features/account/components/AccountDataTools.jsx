import React, { useRef, useState } from "react";
import { apiRequest } from "../../../shared/api/apiClient";
import { exportCsv } from "../../../shared/lib/csvExport";
import { downloadFile } from "../../../shared/lib/downloadFile";
import { getTodayDate } from "../../../shared/lib/format";
import { validateBrowserBackup } from "../../../shared/storage/browserDataStore";

export default function AccountDataTools() {
  const [month, setMonth] = useState(getTodayDate().slice(0, 7));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState(null);
  const locked = useRef(false),
    input = useRef(null);
  async function run(work) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(e.message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function csv(kind) {
    await run(async () => {
      if (kind === "subscriptions") {
        const rows = await apiRequest("/api/v1/subscriptions");
        exportCsv(
          "RoutineSlim-구독목록.csv",
          [
            "서비스",
            "카테고리",
            "결제 금액",
            "통화",
            "결제 주기",
            "주기 간격",
            "상태",
            "다음 결제일",
          ],
          rows.map((s) => [
            s.name,
            s.category,
            s.amount,
            s.currency,
            s.cycle,
            s.cycleInterval,
            s.status,
            s.nextBillingDate,
          ]),
        );
      } else {
        const rows = await apiRequest(`/api/v1/payments?month=${encodeURIComponent(month)}`);
        exportCsv(
          `RoutineSlim-청구내역-${month}.csv`,
          ["결제일", "서비스", "카테고리", "금액", "통화"],
          rows.map((p) => [p.paidOn, p.description, p.category, p.amount, p.currency]),
        );
      }
      setMessage("CSV 다운로드를 요청했습니다. 브라우저 다운로드 목록에서 확인해주세요.");
    });
  }
  async function backup() {
    await run(async () => {
      const bundle = await apiRequest("/api/v1/browser-data");
      downloadFile(
        `RoutineSlim-브라우저백업-${getTodayDate()}.json`,
        JSON.stringify(bundle, null, 2),
        "application/json",
      );
      setMessage("백업 파일 다운로드를 요청했습니다. 브라우저 다운로드 목록에서 확인해주세요.");
    });
  }
  async function inspect(file) {
    setPending(null);
    if (!file) return;
    await run(async () => {
      if (file.size > 2000000) throw new Error("백업 파일은 2MB 이하여야 합니다.");
      let bundle;
      try {
        bundle = JSON.parse(await file.text());
      } catch {
        throw new Error("정상적인 JSON 백업 파일을 선택해주세요.");
      }
      const current = await apiRequest("/api/v1/browser-data/identity");
      validateBrowserBackup(current.memberId, bundle);
      setPending(bundle);
    });
  }
  async function restore() {
    if (!pending) return;
    await run(async () => {
      await apiRequest("/api/v1/browser-data", { method: "PUT", body: pending });
      setPending(null);
      window.dispatchEvent(new Event("routineslim:notifications"));
      setMessage("이 브라우저의 절약 목표·비교 선택·알림 확인 상태를 복원했습니다.");
    });
  }
  return (
    <section className="panel" aria-label="데이터 관리">
      <h2>데이터 내보내기</h2>
      <p className="muted">
        현재 서버의 구독 목록과 선택한 달의 실제 청구 내역을 CSV로 내려받습니다. 엑셀에서 열 수
        있습니다.
      </p>
      <div className="feature-actions">
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => csv("subscriptions")}
        >
          구독 목록 CSV
        </button>
        <label>
          청구 내역 월{" "}
          <input
            type="month"
            aria-label="내보낼 청구 월"
            value={month}
            disabled={busy}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="secondary"
          disabled={busy || !month}
          onClick={() => csv("payments")}
        >
          선택 월 청구 CSV
        </button>
      </div>
      <h2 style={{ marginTop: 24 }}>백업·복원</h2>
      <p className="muted">
        절약 목표·실천 체크·절약 기록·비교 선택·알림 확인 상태는 이 브라우저에만 저장됩니다. JSON
        파일을 같은 계정의 다른 기기에서 가져와 옮길 수 있습니다. 자동 동기화와 서버 구독·청구
        데이터 복원은 포함하지 않습니다.
      </p>
      <div className="feature-actions">
        <button type="button" className="secondary" disabled={busy} onClick={backup}>
          JSON 백업 내려받기
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => input.current.click()}
        >
          백업 파일 선택
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            inspect(file);
          }}
        />
      </div>
      {pending && (
        <div className="feature-note">
          <p>
            복원할 목표 {pending.data.goals.length}개 · 절약 기록{" "}
            {pending.data.goals.reduce((n, g) => n + g.entries.length, 0)}건 · 비교 선택{" "}
            {pending.data.selection.length}개
          </p>
          <p>
            현재 브라우저에 저장된 해당 기록 전체를 파일 내용으로 덮어씁니다. 필요한 경우 먼저 JSON
            백업을 내려받으세요.
          </p>
          <button type="button" className="primary" disabled={busy} onClick={restore}>
            이 브라우저의 기록 덮어쓰기
          </button>{" "}
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            취소
          </button>
        </div>
      )}
      {busy && <p role="status">처리 중...</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
