import BrandLogo from "../../components/common/BrandLogo";
import "../../styles/login.css";
import RegistrationPage from "./RegistrationPage";
import React, { useState, useEffect } from "react";
import { request } from "../../api/apiClient";
export default function LoginPage({ onLogin, onRecover, onAbout, onSupport }) {
  const [providers, setProviders] = useState({});
  useEffect(() => {
    request("/api/oauth/providers")
      .then(setProviders)
      .catch(() =>
        setError(
          "소셜 로그인 설정을 확인하지 못했습니다. 서버 연결을 확인해주세요.",
        ),
      );
    if (new URLSearchParams(location.search).has("oauth_error"))
      request("/api/oauth/error")
        .then((value) => setError(value.message))
        .catch(() =>
          setError("소셜 로그인에 실패했습니다. 다시 시도해주세요."),
        );
  }, []);
  const [rememberMe, setRememberMe] = useState(true);
  const [id, setId] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(
      () => new URLSearchParams(location.search).get("register") === "1",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function socialLogin(provider) {
    setError("");
    setBusy(true);
    try {
      const value = await request("/api/oauth/" + provider + "/start");
      window.location.assign(value.authorizationUrl);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const account = await request(register ? "/api/register" : "/api/login", {
        method: "POST",
        body: { id, password, rememberMe },
      });
      onLogin(account.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (register)
    return (
      <RegistrationPage
        onBack={() => {
          setRegister(false);
          setError("");
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  return (
    <div className="reference-auth">
      <header className="login-brandbar">
        <button className="login-brand" onClick={onAbout}>
          <BrandLogo english />
        </button>
        <span>구독·고정비 관리 플랫폼</span>
      </header>
      <main className="login-shell">
        <section className="login-story">
          <span className="login-eyebrow">SMART FIXED COST MANAGEMENT</span>
          <h1>
            구독, 고정비를
            <br />
            한눈에 관리하세요.
          </h1>
          <p className="login-intro">
            흩어진 구독과 고정비를 한곳에서 관리하고,
            <br />
            나에게 맞는 절감 솔루션을 만나보세요.
          </p>
          <div className="login-benefits">
            {[
              ["▣", "구독 관리", "모든 구독 서비스를 한곳에서"],
              ["▥", "지출 분석", "월별 지출을 한눈에"],
              ["▦", "캘린더", "결제 일정을 미리 확인"],
              ["♧", "커뮤니티", "절약 노하우를 함께 공유"],
            ].map(([icon, title, copy]) => (
              <div key={title}>
                <i aria-hidden="true">{icon}</i>
                <span>
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="login-preview">
            <div className="login-preview-heading">
              <b>
                <BrandLogo english />
              </b>
              <small>대시보드 미리보기 · 예시</small>
            </div>
            <div className="login-preview-stats">
              <div>
                <small>이번 달 지출 금액</small>
                <strong>₩ 42,500</strong>
                <small>구독 현황을 한눈에</small>
              </div>
              <div>
                <small>구독 서비스</small>
                <strong>5개</strong>
                <small>월별 구독 개수</small>
              </div>
              <div>
                <small>절약 가능 금액</small>
                <strong>₩ 15,000</strong>
                <small>맞춤 절감 분석</small>
              </div>
            </div>
            <div className="login-preview-bars" aria-hidden="true">
              {[34, 58, 49, 77, 62, 91].map((height, i) => (
                <i key={i} style={{ height: height + "%" }} />
              ))}
            </div>
            <p>서비스 이해를 돕기 위한 화면 예시입니다.</p>
          </div>
        </section>
        <section className="login-form-panel">
          <h2>로그인</h2>
          <p className="login-subtitle">
            RoutineSlim에 로그인하고 나만의 구독을 관리하세요.
          </p>
          <div className="login-tabs">
            <button className="selected" aria-label="로그인 탭" type="button">
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setRegister(true);
                setError("");
              }}
            >
              회원가입
            </button>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="signin-id">
              이메일 또는 아이디 <em>*</em>
            </label>
            <input
              id="signin-id"
              aria-label="아이디"
              value={id}
              required
              maxLength={255}
              autoComplete="username"
              placeholder="이메일 또는 아이디를 입력하세요"
              onChange={(e) => setId(e.target.value)}
            />
            <label htmlFor="signin-password">
              비밀번호 <em>*</em>
            </label>
            <input
              id="signin-password"
              aria-label="비밀번호"
              type="password"
              value={password}
              required
              maxLength={128}
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요"
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="login-options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                로그인 상태 유지
              </label>
              <button type="button" onClick={onRecover}>
                비밀번호 찾기
              </button>
            </div>
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button className="login-submit" disabled={busy}>
              {busy ? "로그인 중..." : "로그인"}
            </button>
          </form>
          <div className="login-divider">또는 간편 로그인</div>
          <div className="login-socials">
            {Object.entries({
              google: "Google",
              naver: "네이버",
              kakao: "카카오",
            }).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-label={label + " 로그인"}
                disabled={busy}
                onClick={() => socialLogin(key)}
                title={
                  providers[key]
                    ? "소셜 로그인"
                    : "개발자 키 설정 후 이용할 수 있습니다"
                }
              >
                <b className={"social-" + key}>
                  {key === "google" ? "G" : key === "naver" ? "N" : "●"}
                </b>
                {label}
              </button>
            ))}
          </div>
          <p className="login-social-note">
            소셜 로그인은 개발자 키를 등록하면 활성화됩니다.
          </p>
          <nav className="login-help">
            <button onClick={onRecover}>아이디 · 비밀번호 찾기</button>
            <button onClick={onAbout}>서비스 소개</button>
            <button onClick={onSupport}>고객센터</button>
          </nav>
        </section>
      </main>
    </div>
  );
}
