import { serializeBody, readResponse, getErrorMessage } from "./http";
import { isUuid } from "../lib/identifiers";
/** Platform-neutral client for RoutineSlim Server-dev. No React, DOM, router or storage dependency. */
export class ApiError extends Error {
  constructor(message, status = 0, code = status ? `HTTP_${status}` : "NETWORK_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
function subscriptionPath(id) {
  if (!isUuid(id)) throw new ApiError("올바른 구독 UUID가 아닙니다.", 0, "INVALID_ID");
  return `/api/v1/subscriptions/${id}`;
}
export function createServerClient({
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
    if (
      !path.startsWith("/api/v1/") &&
      !path.startsWith("/api/web/") &&
      !path.startsWith("/auth/") &&
      !path.startsWith("/users/") &&
      !path.startsWith("/payment/") &&
      path !== "/usage" &&
      !path.startsWith("/usage/")
    )
      throw new ApiError("허용되지 않은 서버 API 주소입니다.", 0, "INVALID_PATH");
    const headers = { Accept: "application/json", ...extraHeaders };
    if (member) {
      const id = getMemberId();
      if (!isUuid(id)) throw new ApiError("로그인이 필요합니다.", 401, "AUTH_REQUIRED");
      headers["X-Member-Id"] = id;
    }
    if (typeof body === "string") headers["Content-Type"] = "application/json";
    const serializedBody = serializeBody(body, headers);
    let response;
    try {
      response = await fetchImpl(`${origin}${path}`, {
        method,
        headers,
        credentials: "include",
        ...(body === undefined ? {} : { body: serializedBody }),
      });
    } catch {
      throw new ApiError("서버에 연결하지 못했습니다. 서버 주소와 실행 상태를 확인해주세요.");
    }
    const value = await readResponse(response);
    if (!response.ok) {
      if ([401, 403].includes(response.status) && member) onUnauthorized(response.status);
      throw new ApiError(
        getErrorMessage(value, `서버 요청에 실패했습니다 (${response.status}).`),
        response.status,
      );
    }
    return value;
  }
  async function requestMemberId(path, body, action) {
    const id = await request(path, { method: "POST", member: false, body });
    if (!isUuid(id))
      throw new ApiError(`서버 ${action} 응답이 회원 UUID 형식이 아닙니다.`, 0, "INVALID_RESPONSE");
    return id;
  }
  return {
    request,
    login: (credentials) => requestMemberId("/auth/login", credentials, "로그인"),
    signup: (body) => requestMemberId("/auth/signup", body, "회원가입"),
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
