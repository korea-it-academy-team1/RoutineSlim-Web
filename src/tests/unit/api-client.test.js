import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const MEMBER = "12345678-1234-1234-1234-123456789012";
const SUB = "87654321-4321-4321-4321-210987654321";
const row = {
  id: SUB,
  name: "넷플릭스",
  categoryId: 4,
  amount: 17000,
  billingCycle: "MONTHLY",
  billingDay: 12,
  startDate: "2026-10-12",
  nextBillingDate: "2026-11-12",
  status: "ACTIVE",
  cycleInterval: 1,
  memo: "기존 메모",
  notifyEnabled: false,
  notifyDaysBefore: 3,
  presetId: 7,
  cardId: 8,
  currency: "KRW",
  trialEndDate: null,
};
const response = (value, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () =>
    value == null ? "" : typeof value === "string" ? value : JSON.stringify(value),
  json: async () => value,
});
let fetchMock;
beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_MODE", "original");
  vi.stubEnv("VITE_API_BASE_URL", "");
  vi.stubEnv("VITE_SERVER_CATEGORY_IDS", "{}");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function api(mode = "original") {
  vi.stubEnv("VITE_API_MODE", mode);
  return (await import("../../shared/api/apiClient")).apiRequest;
}
async function server() {
  const apiRequest = await api("server-dev");
  fetchMock.mockResolvedValueOnce(response(MEMBER));
  await apiRequest("/api/login", {
    method: "POST",
    body: { id: "tester", password: "not-stored", rememberMe: true },
  });
  fetchMock.mockImplementation(async (path, options = {}) => {
    if (path === "/usage") return response([]);
    if (path.startsWith("/usage/"))
      return response({ subscriptionId: SUB, ...JSON.parse(options.body) });
    if (path === "/api/v1/subscriptions" && options.method === "GET")
      return response([row, { ...row, id: "other", status: "CANCELED" }]);
    if (path === "/api/v1/subscriptions" || path === "/api/v1/subscriptions/" + SUB)
      return response({ ...row, ...JSON.parse(options.body || "{}") });
    if (path.startsWith("/payment/monthly?"))
      return response({
        yearMonth: new URL(path, "http://local").searchParams.get("yearMonth"),
        totalAmount: 0,
        count: 0,
        payments: [],
      });
    return response({ detail: "missing" }, 404);
  });
  return apiRequest;
}
describe("original web API is preserved", () => {
  it("keeps CSRF, cookies and body serialization when API origin is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://server.example/");
    const apiRequest = await api();
    fetchMock
      .mockResolvedValueOnce(response({ token: "test-csrf", headerName: "X-CSRF-TOKEN" }))
      .mockResolvedValueOnce(response({ id: 1 }));
    expect(
      await apiRequest("/api/v1/subscriptions", { method: "POST", body: { name: "서비스" } }),
    ).toEqual({ id: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://server.example/api/csrf");
    expect(fetchMock.mock.calls[1][0]).toBe("https://server.example/api/v1/subscriptions");
    const options = fetchMock.mock.calls[1][1];
    expect(options.credentials).toBe("include");
    expect(options.headers["X-CSRF-TOKEN"]).toBe("test-csrf");
    expect(JSON.parse(options.body)).toEqual({ name: "서비스" });
  });
  it("refuses writes if CSRF is unavailable", async () => {
    const apiRequest = await api();
    fetchMock.mockResolvedValue(response(null, 403));
    await expect(apiRequest("/api/login", { method: "POST", body: { id: "a" } })).rejects.toThrow(
      "보안 토큰",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects non-API paths", async () => {
    const apiRequest = await api();
    await expect(apiRequest("https://elsewhere.example")).rejects.toThrow("허용되지 않은");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe("optional Server-dev bridge", () => {
  it("maps login and remembers only member UUID, never password", async () => {
    await server();
    expect(fetchMock.mock.calls[0][0]).toBe("/auth/login");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      memberName: "tester",
      memberPassword: "not-stored",
    });
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain("not-stored");
    expect(localStorage.getItem("routineslim.server-dev.member.v1")).toBe(MEMBER);
  });
  it("does not sign in on malformed login response", async () => {
    const apiRequest = await api("server-dev");
    fetchMock.mockResolvedValueOnce(response({ id: MEMBER }));
    await expect(
      apiRequest("/api/login", { method: "POST", body: { id: "tester", password: "wrong" } }),
    ).rejects.toThrow("UUID");
    fetchMock.mockResolvedValueOnce(response({ detail: "로그인이 필요합니다." }, 401));
    await expect(apiRequest("/api/me")).rejects.toThrow("로그인");
  });
  it("converts all subscription states and sends member header", async () => {
    vi.stubEnv("VITE_SERVER_CATEGORY_IDS", '{"영상":4}');
    const apiRequest = await server();

    const items = await apiRequest("/api/v1/subscriptions");
    expect(items).toHaveLength(2);
    expect(items[1].status).toBe("canceled");
    expect(items[0]).toMatchObject({
      id: SUB,
      category: "영상",
      cycle: "monthly",
      day: 12,
      billingAnchorDate: "2026-10-12",
      status: "active",
    });
    expect(fetchMock.mock.calls[1][1].headers["X-Member-Id"]).toBe(MEMBER);
  });
  it("maps create to real category ID and validated billing date", async () => {
    vi.stubEnv("VITE_SERVER_CATEGORY_IDS", '{"영상":4}');
    const apiRequest = await server();

    await apiRequest("/api/v1/subscriptions", {
      method: "POST",
      body: {
        name: "넷플릭스",
        category: "영상",
        amount: 17000,
        cycle: "monthly",
        day: 12,
        billingAnchorDate: "2026-10-12",
        status: "active",
      },
    });
    expect(
      JSON.parse(
        fetchMock.mock.calls.find(
          ([path, o]) => path === "/api/v1/subscriptions" && o.method === "POST",
        )[1].body,
      ),
    ).toMatchObject({
      categoryId: 4,
      billingCycle: "MONTHLY",
      startDate: "2026-10-12",
      status: "ACTIVE",
    });
  });
  it("preserves hidden server fields when editing", async () => {
    vi.stubEnv("VITE_SERVER_CATEGORY_IDS", '{"영상":4}');
    const apiRequest = await server();

    const result = await apiRequest("/api/v1/subscriptions/" + SUB, {
      method: "PUT",
      body: {
        name: "넷플릭스",
        category: "영상",
        amount: 19000,
        cycle: "monthly",
        day: 12,
        billingAnchorDate: "2026-10-12",
        status: "active",
      },
    });
    expect(result.amount).toBe(19000);
    expect(
      JSON.parse(
        fetchMock.mock.calls.find(([path, o]) => path.endsWith(SUB) && o.method === "PUT")[1].body,
      ),
    ).toMatchObject({
      presetId: 7,
      cardId: 8,
      memo: "기존 메모",
      notifyEnabled: false,
      notifyDaysBefore: 3,
      categoryId: 4,
    });
  });
  it("persists review separately from the actual subscription status", async () => {
    vi.stubEnv("VITE_SERVER_CATEGORY_IDS", '{"영상":4}');
    const apiRequest = await server();
    const result = await apiRequest("/api/v1/subscriptions", {
      method: "POST",
      body: {
        name: "서비스",
        category: "영상",
        amount: 1000,
        cycle: "monthly",
        day: 12,
        billingAnchorDate: "2026-10-12",
        status: "review",
      },
    });
    expect(result.status).toBe("review");
    const write = fetchMock.mock.calls.find(
      ([p, o]) => p.startsWith("/usage/") && o.method === "PUT",
    );
    expect(JSON.parse(write[1].body)).toEqual({ usageLevel: "RARELY" });
  });
  it("rejects unavailable community features and derives reports from monthly payments", async () => {
    const apiRequest = await server();
    await expect(apiRequest("/api/v1/community/posts")).rejects.toMatchObject({
      code: "API_NOT_AVAILABLE",
    });
    await expect(apiRequest("/api/v1/reports/monthly?month=2026-11")).resolves.toMatchObject({
      total: 0,
    });
  });
  it("clears session on protected API denial and dispatches unauthorized", async () => {
    const apiRequest = await server();
    const listener = vi.fn();
    window.addEventListener("routineslim:unauthorized", listener);
    fetchMock.mockResolvedValueOnce(response(null, 403));
    await expect(apiRequest("/api/v1/subscriptions")).rejects.toThrow("403");
    expect(localStorage.getItem("routineslim.server-dev.member.v1")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("routineslim:unauthorized", listener);
  });
});

describe("server configuration defaults", () => {
  it("uses the supplied server protocol without a CSRF preflight by default", async () => {
    vi.stubEnv("VITE_API_MODE", "");
    const { apiRequest } = await import("../../shared/api/apiClient");
    fetchMock.mockResolvedValueOnce(response(MEMBER));
    await expect(
      apiRequest("/api/login", { method: "POST", body: { id: "tester", password: "not-stored" } }),
    ).resolves.toEqual({ id: MEMBER });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/auth/login");
  });
  it("rejects an unknown API mode instead of silently choosing an authentication flow", async () => {
    vi.stubEnv("VITE_API_MODE", "unknown");
    const { apiRequest } = await import("../../shared/api/apiClient");
    await expect(apiRequest("/api/login", { method: "POST" })).rejects.toThrow("VITE_API_MODE");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
