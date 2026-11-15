import { serializeBody, readResponse, getErrorMessage } from "./http";
import { requestServerApi } from "./server/serverAdapter";
import { getApiConfig } from "./apiConfig";
/** Server-dev is the default. The optional original cookie backend uses CSRF. */
export async function apiRequest(path, options = {}) {
  const { mode, baseUrl } = getApiConfig();
  if (mode === "server-dev") return requestServerApi(path, options);
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...options.headers };
  if (!path.startsWith("/api/")) throw new Error("허용되지 않은 API 주소입니다.");
  const body = options.body == null ? options.body : serializeBody(options.body, headers);
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
  const value = await readResponse(response);
  if (!response.ok) {
    if (
      response.status === 401 &&
      !["/api/login", "/api/me", "/api/csrf"].includes(path) &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("routineslim:unauthorized"));
    throw new Error(getErrorMessage(value, `요청 실패 (${response.status})`));
  }
  return value;
}
