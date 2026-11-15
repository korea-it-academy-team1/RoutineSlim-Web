import * as authApi from "../api/authApi";
const KEY = "routineslim.social.pending.v1";
let completion;
export function isSocialCallback() {
  const query = new URLSearchParams(window.location.search);
  return query.has("state") && (query.has("code") || query.has("error"));
}
export async function beginSocialLogin(provider, rememberMe) {
  const result = await authApi.startSocialLogin(provider);
  const url = new URL(result.authorizationUrl);
  const hosts = { GOOGLE: "accounts.google.com", KAKAO: "kauth.kakao.com", NAVER: "nid.naver.com" };
  if (url.protocol !== "https:" || url.hostname !== hosts[provider] || !result.state)
    throw new Error("소셜 로그인 주소를 확인할 수 없습니다.");
  sessionStorage.setItem(
    KEY,
    JSON.stringify({ state: result.state, rememberMe, expiresAt: Date.now() + 600000 }),
  );
  window.location.assign(url.href);
}
export function finishSocialLogin() {
  // StrictMode replays effects; exchange each one-use authorization code once.
  if (completion) return completion;
  const query = new URLSearchParams(window.location.search);
  let pending;
  try {
    pending = JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    /* Invalid state is rejected below. */
  }
  sessionStorage.removeItem(KEY);
  const code = query.get("code"),
    state = query.get("state"),
    error = query.get("error");
  const url = new URL(window.location.href);
  for (const key of ["code", "state", "error", "error_description", "scope", "authuser", "prompt"])
    url.searchParams.delete(key);
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  if (!pending || pending.state !== state || pending.expiresAt < Date.now())
    return Promise.reject(
      new Error("소셜 로그인 요청이 만료되었거나 일치하지 않습니다. 다시 시작해주세요."),
    );
  completion = authApi.completeSocialLogin({ code, state, error, rememberMe: pending.rememberMe });
  completion
    .finally(() => {
      completion = undefined;
    })
    .catch(() => {});
  return completion;
}
