/** Platform-neutral client for RoutineSlim Server-dev. No React, DOM, router or storage dependency. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class RoutineSlimApiError extends Error {
  constructor(message, status = 0, code = status ? `HTTP_${status}` : "NETWORK_ERROR") {
    super(message);
    this.name = "RoutineSlimApiError";
    this.status = status;
    this.code = code;
  }
}
function subscriptionPath(id) {
  if (typeof id !== "string" || !UUID.test(id))
    throw new RoutineSlimApiError("올바른 구독 UUID가 아닙니다.", 0, "INVALID_ID");
  return `/api/v1/subscriptions/${id}`;
}
export function createRoutineSlimApiClient({
  baseUrl = "",
  fetchImpl = (...args) => globalThis.fetch(...args),
  getMemberId = () => null,
  onUnauthorized = () => {},
} = {}) {
  const origin = baseUrl.replace(/\/+$/, "");
  async function request(
    path,
    { method = "GET", body, member = true, headers: extraHeaders = {} } = {},
  ) {
    if (!path.startsWith("/api/v1/") && !path.startsWith("/auth/"))
      throw new RoutineSlimApiError("허용되지 않은 서버 API 주소입니다.", 0, "INVALID_PATH");
    const headers = { Accept: "application/json", ...extraHeaders };
    if (member) {
      const id = getMemberId();
      if (typeof id !== "string" || !UUID.test(id))
        throw new RoutineSlimApiError("로그인이 필요합니다.", 401, "AUTH_REQUIRED");
      headers["X-Member-Id"] = id;
    }
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    let response;
    try {
      response = await fetchImpl(`${origin}${path}`, {
        method,
        headers,
        credentials: "include",
        ...(body === undefined
          ? {}
          : { body: isForm || typeof body === "string" ? body : JSON.stringify(body) }),
      });
    } catch {
      throw new RoutineSlimApiError(
        "서버에 연결하지 못했습니다. 서버 주소와 실행 상태를 확인해주세요.",
      );
    }
    const raw = await response.text();
    let value = raw;
    try {
      value = raw ? JSON.parse(raw) : null;
    } catch {
      /* The login endpoint can return a plain UUID. */
    }
    if (!response.ok) {
      if ([401, 403].includes(response.status) && member) onUnauthorized(response.status);
      throw new RoutineSlimApiError(
        typeof (value?.message || value?.detail) === "string"
          ? value.message || value.detail
          : `서버 요청에 실패했습니다 (${response.status}).`,
        response.status,
      );
    }
    return value;
  }
  return {
    request,
    async login(credentials) {
      const id = await request("/auth/login", { method: "POST", member: false, body: credentials });
      if (typeof id !== "string" || !UUID.test(id))
        throw new RoutineSlimApiError(
          "서버 로그인 응답이 회원 UUID 형식이 아닙니다.",
          0,
          "INVALID_RESPONSE",
        );
      return id;
    },
    signup: (body) => request("/auth/signup", { method: "POST", member: false, body }),
    listSubscriptions: (status) =>
      request(`/api/v1/subscriptions${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    getSubscription: (id) => request(subscriptionPath(id)),
    createSubscription: (body) => request("/api/v1/subscriptions", { method: "POST", body }),
    updateSubscription: (id, body) => request(subscriptionPath(id), { method: "PUT", body }),
    changeSubscriptionStatus: (id, body) =>
      request(`${subscriptionPath(id)}/status`, { method: "PATCH", body }),
    deleteSubscription: (id) => request(subscriptionPath(id), { method: "DELETE" }),
    scanReceipt: (formData) =>
      request("/api/v1/subscriptions/scan", { method: "POST", body: formData }),
  };
}
