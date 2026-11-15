import { beforeEach, afterEach, expect, it, vi } from "vitest";
const member = "01900000-0000-7000-8000-000000000001";
const id = "01900000-0000-7000-8000-000000000002";
let fetch;
beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  vi.stubEnv("VITE_API_MODE", "server-dev");
  fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const response = (value) => ({ ok: true, text: async () => JSON.stringify(value) });
async function api() {
  return (await import("../../shared/api/apiClient")).apiRequest;
}
it("restores the verified server member instead of trusting the browser UUID", async () => {
  localStorage.setItem("routineslim.server-dev.member.v1", id);
  fetch.mockResolvedValueOnce(response({ memberId: member }));
  const request = await api();
  await expect(request("/api/me")).resolves.toEqual({ id: member });
  expect(fetch.mock.calls[0][0]).toBe("/users/me");
  expect(localStorage.getItem("routineslim.server-dev.member.v1")).toBe(member);
});
it("rejects unsupported OAuth code exchange before making a network request", async () => {
  const request = await api();
  await expect(
    request("/api/social/code", { method: "POST", body: { code: "x" } }),
  ).rejects.toMatchObject({ code: "API_NOT_AVAILABLE" });
  expect(fetch).not.toHaveBeenCalled();
});
it("maps status changes and requires a date for trial requests", async () => {
  const request = await api();
  fetch.mockResolvedValueOnce(response(member));
  await request("/api/login", { method: "POST", body: { id: "member", password: "pw" } });
  fetch.mockResolvedValueOnce(
    response({ id, status: "PAUSED", categoryId: 4, billingCycle: "MONTHLY" }),
  );
  const result = await request(`/api/v1/subscriptions/${id}/status`, {
    method: "PATCH",
    body: { status: "PAUSED", trialEndDate: null },
  });
  expect(result.status).toBe("paused");
  expect(fetch.mock.calls[1][1].method).toBe("PATCH");
  expect(fetch.mock.calls[1][1].headers["X-Member-Id"]).toBe(member);
  await expect(
    request(`/api/v1/subscriptions/${id}/status`, { method: "PATCH", body: { status: "TRIAL" } }),
  ).rejects.toThrow("체험 종료일");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("invalid social login responses do not establish a local session", async () => {
  fetch.mockResolvedValueOnce(response({ unexpected: true }));
  const request = await api();
  await expect(
    request("/api/social/code", { method: "POST", body: { code: "code", state: "state" } }),
  ).rejects.toMatchObject({ code: "API_NOT_AVAILABLE" });
  expect(sessionStorage.getItem("routineslim.server-dev.member.v1")).toBeNull();
});
