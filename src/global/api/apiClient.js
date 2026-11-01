import { requestServerApi } from "./serverApiAdapter";
import { getApiConfig } from "./apiConfig";
/** Server-dev is the default. The optional original cookie backend uses CSRF. */
export async function apiRequest(path, options = {}) {
  const { mode, baseUrl } = getApiConfig();
  if (mode === "server-dev") return requestServerApi(path, options);
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...options.headers };
  if (!path.startsWith("/api/")) throw new Error("허용되지 않은 API 주소입니다.");
  let body = options.body;
  if (body != null && typeof body !== "string" && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch(`${baseUrl}/api/csrf`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!csrfResponse.ok)
      throw new Error("보안 토큰을 가져오지 못했습니다. 새로고침 후 다시 시도하세요.");
    const csrf = await csrfResponse.json();
    const token = csrf.token || csrf.csrfToken || csrf._csrf?.token;
    if (!token) throw new Error("보안 토큰이 비어 있습니다.");
    headers[csrf.headerName || "X-XSRF-TOKEN"] = token;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    method,
    body,
    headers,
    credentials: "include",
  });
  const raw = await response.text();
  let value = null;
  if (raw) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
  }
  if (!response.ok) {
    if (
      response.status === 401 &&
      !["/api/login", "/api/me", "/api/csrf"].includes(path) &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("routineslim:unauthorized"));
    const detail =
      value && typeof value === "object" ? value.message || value.detail || value.error : null;
    throw new Error(typeof detail === "string" ? detail : `요청 실패 (${response.status})`);
  }
  return value;
}
export const formatWon = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
export const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
