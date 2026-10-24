import React, { useEffect, useState } from "react";
import { useAccountSetting } from "../../hooks/useAccountSetting";
import CommunityReportModeration from "../admin/components/CommunityReportModeration";
import AccountDataBackup from "../account/components/AccountDataBackup";
import { request, money } from "../../api/apiClient";
export default function ReminderSettingsPage({ user }) {
  const setting = useAccountSetting(user, "reminder-days", 7);
  const days = Number(setting.value),
    setDays = setting.setValue;
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    request("/api/v1/reminders")
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    if (!setting.ready) return;
    try {
      await setting.save(days);
      setSaved(true);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section>
      <div className="heading">
        <h1>결제 알림 설정</h1>
        <p>대시보드에 표시할 결제 예정 알림 기간을 선택합니다.</p>
      </div>
      <div className="panel">
        <form onSubmit={save} className="reminder-form">
          <label>
            알림 표시 기준{" "}
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setSaved(false);
              }}
            >
              {[0, 1, 3, 7].map((x) => (
                <option key={x} value={x}>
                  {x === 0 ? "결제 당일" : `결제 ${x}일 전부터`}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={!setting.ready}>
            설정 저장
          </button>
        </form>
        {saved && <p role="status">계정에 알림 표시 설정을 저장했습니다.</p>}
        <p className="muted">
          현재 서버는 7일 이내 예정 결제만 제공합니다. 이메일·문자·푸시 알림은
          발송하지 않습니다.
        </p>
      </div>
      {(error || setting.error) && (
        <p role="alert" className="error">
          {error || setting.error}
        </p>
      )}
      <div className="panel">
        <h2>선택한 기간의 결제 예정</h2>
        {items.filter((x) => x.daysUntil <= days).length ? (
          items
            .filter((x) => x.daysUntil <= days)
            .map((x) => (
              <div className="item" key={x.subscriptionId}>
                <span>
                  {x.name} · {x.date} ({x.daysUntil}일 후)
                </span>
                <b>{money(x.amount)}</b>
              </div>
            ))
        ) : (
          <p className="muted">해당 기간의 결제 예정이 없습니다.</p>
        )}
      </div>
      <AccountDataBackup />
      <CommunityReportModeration />
    </section>
  );
}
