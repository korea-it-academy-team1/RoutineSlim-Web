import { SERVER_SUBSCRIPTION_STATUSES } from "../../../shared/api/serverContracts";
import { SUBSCRIPTION_STATUS_LABELS } from "../utils/subscriptionStatus";
import React, { useRef, useState } from "react";
import { Modal } from "../../../shared/components/PagePrimitives";
import { changeSubscriptionStatus } from "../api/subscriptionsApi";
export default function SubscriptionStatusForm({ subscription, onSaved, onClose }) {
  const [status, setStatus] = useState(subscription.status.toUpperCase());
  const [trialEndDate, setTrialEndDate] = useState(subscription.trialEndDate || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function save(event) {
    event.preventDefault();
    if (pending.current) return;
    if (status === "TRIAL" && !trialEndDate) {
      setError("체험 종료일을 입력해주세요.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await changeSubscriptionStatus(subscription.id, status, trialEndDate);
      if (!saved || saved.id !== subscription.id)
        throw new Error("서버의 상태 변경 결과를 확인할 수 없습니다. 다시 불러와주세요.");
      window.dispatchEvent(new Event("routineslim:subscriptions"));
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${subscription.name} 상태 변경`}
      error={error}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save} className="form-grid">
        <label>
          구독 상태
          <select
            aria-label="구독 상태"
            value={status}
            disabled={busy}
            onChange={(event) => setStatus(event.target.value)}
          >
            {SERVER_SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SUBSCRIPTION_STATUS_LABELS[status.toLowerCase()]}
              </option>
            ))}
          </select>
        </label>
        {status === "TRIAL" && (
          <label>
            체험 종료일
            <input
              type="date"
              required
              value={trialEndDate}
              disabled={busy}
              onChange={(event) => setTrialEndDate(event.target.value)}
            />
          </label>
        )}
        <p>
          이 변경은 RoutineSlim의 관리 상태에 반영됩니다. 실제 서비스의 결제·해지는 해당 서비스에서
          진행해주세요.
        </p>
        {status === "CANCELED" && <p>해지 상태로 기록하며 구독 내역은 보관합니다.</p>}
        <div className="form-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            취소
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "변경 중..." : "상태 변경 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
