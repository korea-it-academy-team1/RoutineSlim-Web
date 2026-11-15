import React, { useEffect, useRef, useState } from "react";
import { signup } from "../api/authApi";

export default function SignupForm({ onComplete, onCancel }) {
  const [values, setValues] = useState({
    memberName: "",
    memberPassword: "",
    confirmPassword: "",
    name: "",
    email: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const memberNameInput = useRef(null);
  const [idFeedback, setIdFeedback] = useState(null);
  const [duplicateName, setDuplicateName] = useState(null);
  useEffect(() => {
    if (!busy && idFeedback?.type === "error") memberNameInput.current?.focus();
  }, [busy, idFeedback]);
  function checkMemberName() {
    const name = values.memberName.trim();
    const message = !name
      ? "아이디를 입력해주세요."
      : name.length > 50
        ? "아이디는 50자 이하로 입력해주세요."
        : name === duplicateName
          ? "이미 사용 중인 아이디입니다."
          : null;
    setIdFeedback({
      type: message ? "error" : "info",
      message: message || "입력 형식이 올바릅니다. 중복 여부는 가입 시 서버에서 확인합니다.",
    });
    return !message;
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    if (!values.memberName.trim() || !values.name.trim() || !values.memberPassword) {
      setError("아이디, 비밀번호, 이름을 입력해주세요.");
      return;
    }
    if (!checkMemberName()) return;
    if (values.memberPassword !== values.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (new TextEncoder().encode(values.memberPassword).length > 72) {
      setError("비밀번호는 UTF-8 기준 72바이트 이하로 입력해주세요.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await signup({
        memberName: values.memberName.trim(),
        memberPassword: values.memberPassword,
        name: values.name.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
      });
      onComplete(values.memberName.trim());
    } catch (err) {
      const message = err.message || "회원가입에 실패했습니다. 다시 시도해주세요.";
      if (message.includes("이미 사용 중인 아이디") || /아이디.*중복/.test(message)) {
        setDuplicateName(values.memberName.trim());
        setIdFeedback({ type: "error", message });
      } else setError(message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const fields = [
    ["memberName", "아이디", "text", 50, "username", true],
    ["memberPassword", "비밀번호", "password", 72, "new-password", true],
    ["confirmPassword", "비밀번호 확인", "password", 72, "new-password", true],
    ["name", "이름", "text", 50, "name", true],
    ["email", "이메일 (선택)", "email", 255, "email", false],
    ["phone", "전화번호 (선택)", "tel", 30, "tel", false],
  ];
  return (
    <>
      <h2>회원가입</h2>
      <p className="login-subtitle">계정을 만들고 구독 관리를 시작하세요.</p>
      <form onSubmit={handleSignupSubmit} aria-busy={busy}>
        {fields.map(([key, label, type, maxLength, autoComplete, required]) => (
          <React.Fragment key={key}>
            <label htmlFor={`signup-${key}`}>
              {label} {required && <em>*</em>}
            </label>
            <input
              id={`signup-${key}`}
              aria-label={label}
              ref={key === "memberName" ? memberNameInput : undefined}
              aria-invalid={key === "memberName" ? idFeedback?.type === "error" : undefined}
              aria-describedby={key === "memberName" ? "signup-id-feedback" : undefined}
              type={type}
              maxLength={maxLength}
              autoComplete={autoComplete}
              required={required}
              value={values[key]}
              disabled={busy}
              onChange={(event) => {
                setValues({ ...values, [key]: event.target.value });
                if (key === "memberName") {
                  setIdFeedback(null);
                  setError("");
                  if (event.target.value.trim() !== duplicateName) setDuplicateName(null);
                }
              }}
            />
            {key === "memberName" && (
              <div className="signup-id-check">
                <button type="button" disabled={busy} onClick={checkMemberName}>
                  아이디 입력 확인
                </button>
                <p
                  id="signup-id-feedback"
                  className={
                    idFeedback?.type === "error"
                      ? "signup-id-feedback is-error"
                      : "signup-id-feedback"
                  }
                  role={idFeedback ? (idFeedback.type === "error" ? "alert" : "status") : undefined}
                >
                  {idFeedback?.message ||
                    "아이디는 50자 이하입니다. 중복 여부는 회원가입 시 확인됩니다."}
                </p>
              </div>
            )}
          </React.Fragment>
        ))}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button className="login-submit" disabled={busy}>
          {busy ? "가입 중..." : "회원가입 완료"}
        </button>
      </form>
      <nav className="login-help">
        <button disabled={busy} onClick={onCancel}>
          로그인으로 돌아가기
        </button>
      </nav>
    </>
  );
}
