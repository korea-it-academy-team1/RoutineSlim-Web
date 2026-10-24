import React, { useState } from "react";
import { request } from "../../api/apiClient";
import BrandLogo from "../../components/common/BrandLogo";
import { Tabs, Field } from "../../components/common/SharedUI";
export default function AccountRecoveryPage({ onBack }) {
  const [purpose, setPurpose] = useState("ID"),
    [email, setEmail] = useState(""),
    [requestId, setRequestId] = useState(""),
    [code, setCode] = useState(""),
    [verified, setVerified] = useState(false),
    [ids, setIds] = useState(null),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function start(e) {
    e.preventDefault();
    await run(async () => {
      const r = await request("/api/recovery/start", {
        method: "POST",
        body: { email: email.trim(), purpose },
      });
      setRequestId(r.requestId);
      setMessage(r.message);
      setVerified(false);
      setCode("");
    });
  }
  async function confirm(e) {
    e.preventDefault();
    await run(async () => {
      const r = await request("/api/recovery/confirm", {
        method: "POST",
        body: { requestId, code },
      });
      setVerified(true);
      if (purpose === "ID") setIds(r.ids);
      setMessage("이메일 인증이 완료되었습니다.");
    });
  }
  async function reset(e) {
    e.preventDefault();
    await run(async () => {
      await request("/api/recovery/reset", {
        method: "POST",
        body: { requestId, password, confirmPassword: confirmation },
      });
      setDone(true);
      setPassword("");
      setConfirmation("");
      setMessage("비밀번호를 변경했습니다. 새 비밀번호로 로그인해주세요.");
    });
  }
  function switchTab(value) {
    setPurpose(value);
    setRequestId("");
    setVerified(false);
    setIds(null);
    setCode("");
    setError("");
    setMessage("");
    setDone(false);
  }
  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="brand">
          <BrandLogo english />
        </div>
        <h1>계정 찾기</h1>
        <Tabs
          values={[
            ["ID", "아이디 찾기"],
            ["PASSWORD", "비밀번호 재설정"],
          ]}
          value={purpose}
          onChange={switchTab}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {!verified && !done && (
          <form className="feature-form" onSubmit={start}>
            <Field label="가입 시 인증한 이메일">
              <input
                type="email"
                required
                maxLength={255}
                value={email}
                disabled={busy}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setRequestId("");
                  setCode("");
                }}
              />
            </Field>
            <button className="primary" disabled={busy}>
              {requestId ? "인증번호 재발송" : "인증번호 발송"}
            </button>
          </form>
        )}
        {requestId && !verified && (
          <form className="feature-form" onSubmit={confirm}>
            <Field label="6자리 인증번호">
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <p className="muted">
              유효시간 10분 · 재발송은 60초 후 가능합니다.
            </p>
            <button className="primary" disabled={busy || code.length !== 6}>
              인증 확인
            </button>
          </form>
        )}
        {ids && (
          <div className="panel">
            <h2>가입한 아이디</h2>
            {ids.map((id) => (
              <p key={id}>
                <strong>{id}</strong>
              </p>
            ))}
          </div>
        )}
        {verified && purpose === "PASSWORD" && !done && (
          <form onSubmit={reset} className="feature-form">
            <Field label="새 비밀번호">
              <input
                required
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="새 비밀번호 확인">
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </Field>
            <p className="muted">영문과 숫자를 포함한 8자 이상, 공백 제외</p>
            <button className="primary" disabled={busy}>
              비밀번호 재설정
            </button>
          </form>
        )}
        <button className="link" type="button" disabled={busy} onClick={onBack}>
          로그인으로 돌아가기
        </button>
        <p className="subtle">
          소셜 전용 계정은 해당 제공자의 로그인 기능을 이용해주세요.
        </p>
      </div>
    </div>
  );
}
