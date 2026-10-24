import React, { useEffect, useState } from "react";
import { request } from "../../api/apiClient";
export default function ProfilePage({ onDeleted }) {
  const [profile, setProfile] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [emailDraft, setEmailDraft] = useState(""),
    [emailPassword, setEmailPassword] = useState(""),
    [emailCode, setEmailCode] = useState(""),
    [emailProof, setEmailProof] = useState("");
  const [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    request("/api/v1/members/me")
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await request("/api/v1/members/me", {
        method: "PUT",
        body: {
          displayName: profile.displayName,
          email: profile.email,
          phone: profile.phone,
          birth: profile.birth,
          address: profile.address,
          addressDetail: profile.addressDetail,
          photo: profile.photo,
        },
      });
      setProfile(updated);
      setMessage("회원정보를 저장했습니다.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function sendEmailCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request("/api/v1/members/me/email/send", {
        method: "POST",
        body: { email: emailDraft, currentPassword: emailPassword },
      });
      setEmailProof(result.verificationId);
      setEmailCode("");
      setMessage(
        "새 이메일로 인증번호를 발송했습니다. 10분 안에 입력해주세요.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changeEmail(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await request("/api/v1/members/me/email", {
        method: "PUT",
        body: {
          email: emailDraft,
          currentPassword: emailPassword,
          verificationId: emailProof,
          code: emailCode,
        },
      });
      setProfile(updated);
      setEmailDraft("");
      setEmailPassword("");
      setEmailCode("");
      setEmailProof("");
      setMessage(
        "이메일을 변경했습니다. 앞으로 계정 복구에 새 이메일을 사용하세요.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function selectPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/gif"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("JPG, PNG, GIF 파일은 최대 5MB까지 가능합니다.");
      return;
    }
    try {
      const photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error("사진을 읽지 못했습니다."));
        reader.readAsDataURL(file);
      });
      setProfile((previous) => ({ ...previous, photo }));
      setMessage("변경사항 저장을 누르면 사진이 저장됩니다.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function changePassword(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request("/api/password", {
        method: "PUT",
        body: { currentPassword, password: newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("비밀번호를 변경했습니다.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function removeAccount() {
    if (
      !window.confirm(
        "정말 탈퇴하시겠습니까? 구독·결제·게시글 등 계정 데이터가 삭제되며 복구할 수 없습니다.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await request("/api/me", { method: "DELETE" });
      onDeleted?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="heading">
        <h1>마이페이지</h1>
        <p>계정 정보를 안전하게 관리하세요.</p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {profile ? (
        <div className="panel">
          <div className="profile-hero">
            {profile.photo ? (
              <img src={profile.photo} alt="내 프로필" />
            ) : (
              <span>
                {(profile.displayName || profile.id || "R").slice(0, 1)}
              </span>
            )}
            <div>
              <small>MY ACCOUNT</small>
              <h2>{profile.displayName || profile.id} 님</h2>
              <p>{profile.email}</p>
              <b className="status-pill active">
                {profile.emailVerified ? "이메일 인증 완료" : "내 계정 관리"}
              </b>
            </div>
          </div>
          <h2>내 정보</h2>
          <form className="profile-form" onSubmit={save}>
            <label>
              아이디
              <input value={profile.id || ""} disabled />
            </label>
            <label>
              이름
              <input
                required
                maxLength={120}
                value={profile.displayName || ""}
                onChange={(e) =>
                  setProfile({ ...profile, displayName: e.target.value })
                }
              />
            </label>
            <label>
              이메일
              <input
                type="email"
                readOnly={profile.emailVerified}
                title={
                  profile.emailVerified
                    ? "가입 시 인증한 이메일입니다."
                    : undefined
                }
                maxLength={255}
                value={profile.email || ""}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </label>
            <label>
              연락처
              <input
                type="tel"
                maxLength={20}
                value={profile.phone || ""}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </label>
            <label>
              생년월일
              <input
                type="date"
                value={profile.birth || ""}
                onChange={(e) =>
                  setProfile({ ...profile, birth: e.target.value })
                }
              />
            </label>
            <label>
              주소
              <input
                maxLength={250}
                value={profile.address || ""}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
              />
            </label>
            <label>
              상세 주소
              <input
                maxLength={150}
                value={profile.addressDetail || ""}
                onChange={(e) =>
                  setProfile({ ...profile, addressDetail: e.target.value })
                }
              />
            </label>
            <label>
              프로필 사진 (최대 5MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={selectPhoto}
              />
            </label>
            {profile.photo && (
              <div>
                <img
                  src={profile.photo}
                  alt="프로필 사진"
                  width={80}
                  height={80}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setProfile({ ...profile, photo: "" })}
                >
                  사진 삭제
                </button>
              </div>
            )}
            <button className="primary" disabled={busy}>
              변경사항 저장
            </button>
          </form>
        </div>
      ) : !error ? (
        <p>회원정보를 불러오는 중...</p>
      ) : null}
      {profile?.emailVerified && !profile.id?.startsWith("oauth_") && (
        <div className="panel">
          <h2>이메일 변경</h2>
          <form className="profile-form" onSubmit={changeEmail}>
            <label>
              현재 비밀번호 확인
              <input
                type="password"
                autoComplete="current-password"
                disabled={busy}
                required
                maxLength={128}
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
              />
            </label>
            <label>
              새 이메일
              <input
                type="email"
                disabled={busy}
                required
                maxLength={255}
                value={emailDraft}
                onChange={(e) => {
                  setEmailDraft(e.target.value);
                  setEmailProof("");
                  setEmailCode("");
                }}
              />
            </label>
            <button
              type="button"
              className="secondary"
              disabled={busy || !emailDraft || !emailPassword}
              onClick={sendEmailCode}
            >
              인증번호 발송
            </button>
            {emailProof && (
              <>
                <label>
                  이메일 인증번호
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  이메일 변경 완료
                </button>
              </>
            )}
          </form>
        </div>
      )}
      <div className="panel">
        <h2>비밀번호 변경</h2>
        <form className="profile-form" onSubmit={changePassword}>
          <label>
            현재 비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label>
            새 비밀번호 (8자 이상)
            <input
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            비밀번호 변경
          </button>
        </form>
        <p className="muted">
          소셜 로그인 전용 계정은 별도 비밀번호가 없을 수 있습니다.
        </p>
      </div>
      <div className="panel">
        <h2>회원 탈퇴</h2>
        <p className="muted">
          탈퇴하면 계정과 연결된 데이터가 삭제됩니다. 탈퇴 전에 필요한 내역을
          CSV로 보관하세요.
        </p>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={removeAccount}
        >
          회원 탈퇴
        </button>
      </div>
    </section>
  );
}
