import { isUuid } from "../../lib/identifiers";
const SESSION_KEY = "routineslim.server-dev.member.v1";
let cachedMemberId = null;
function getStoredMemberId() {
  if (cachedMemberId) return cachedMemberId;
  try {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
export function clearMemberSession() {
  cachedMemberId = null;
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      /* Memory is still cleared. */
    }
  }
}
export function storeMemberSession(id, rememberMe) {
  if (!isUuid(id)) {
    clearMemberSession();
    throw new Error("서버 로그인 응답이 회원 UUID 형식이 아닙니다.");
  }
  clearMemberSession();
  cachedMemberId = id;
  try {
    (rememberMe ? localStorage : sessionStorage).setItem(SESSION_KEY, id);
  } catch {
    /* Current tab still works. */
  }
  return { id };
}
export function requireMemberId() {
  const id = getStoredMemberId();
  if (!isUuid(id)) {
    clearMemberSession();
    window.dispatchEvent(new Event("routineslim:unauthorized"));
    throw new Error("로그인이 필요합니다.");
  }
  return id;
}

export function isMemberRemembered() {
  try {
    return Boolean(localStorage.getItem(SESSION_KEY));
  } catch {
    return false;
  }
}
