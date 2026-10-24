import React, { useState } from "react";
import { request } from "../../../api/apiClient";
export default function AccountDataBackup() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function backup() {
    setBusy(true);
    setError("");
    try {
      const subscriptions = await request("/api/v1/subscriptions");
      const blob = new Blob(
        [
          JSON.stringify(
            { format: "RoutineSlim", version: 1, subscriptions },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "RoutineSlim-subscriptions.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 1000000)
        throw Error("백업 파일은 1MB 이하만 가능합니다.");
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : data.subscriptions;
      if (
        !Array.isArray(items) ||
        items.length > 500 ||
        items.some(
          (s) =>
            !s ||
            typeof s.name !== "string" ||
            !s.name.trim() ||
            s.name.length > 255 ||
            typeof s.category !== "string" ||
            !s.category.trim() ||
            s.category.length > 255 ||
            !Number.isSafeInteger(s.amount) ||
            s.amount < 0 ||
            !["monthly", "weekly", "yearly"].includes(s.cycle) ||
            !Number.isInteger(s.day) ||
            s.day < 1 ||
            s.day > 31 ||
            !["active", "review"].includes(s.status),
        )
      )
        throw Error("올바른 구독 백업 파일이 아닙니다.");
      if (!confirm(`${items.length}개의 구독으로 현재 구독 목록을 교체할까요?`))
        return;
      await request("/api/data/subscriptions", {
        method: "PUT",
        body: { json: JSON.stringify(items) },
      });
      setMessage("구독을 복원했습니다. 구독 관리에서 확인할 수 있습니다.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <h2>구독 데이터 백업 · 복원</h2>
      <p className="muted">구독 목록을 JSON 파일로 저장하거나 복원합니다.</p>
      <div className="actions">
        <button className="secondary" disabled={busy} onClick={backup}>
          JSON 백업
        </button>
        <label className="secondary">
          JSON 복원{" "}
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={restore}
          />
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
