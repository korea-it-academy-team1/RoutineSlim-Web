import { apiRequest } from "../../shared/api/apiClient";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("sends signup to the public server endpoint without a member header or session", async () => {
  vi.stubEnv("VITE_API_MODE", "server-dev");
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify("01900000-0000-7000-8000-000000000001"),
  });
  vi.stubGlobal("fetch", fetch);
  const body = {
    memberName: "member",
    memberPassword: "password",
    name: "이름",
    email: null,
    phone: null,
  };
  await expect(apiRequest("/api/signup", { method: "POST", body })).resolves.toBe(
    "01900000-0000-7000-8000-000000000001",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "/auth/signup",
    expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
  );
  expect(fetch.mock.calls[0][1].headers["X-Member-Id"]).toBeUndefined();
});
it("rejects invalid successful signup responses", async () => {
  vi.stubEnv("VITE_API_MODE", "server-dev");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "" }));
  await expect(apiRequest("/api/signup", { method: "POST", body: {} })).rejects.toThrow(
    "회원 UUID",
  );
});
it("forwards OCR multipart files with member authentication and preserves the multipart boundary", async () => {
  vi.stubEnv("VITE_API_MODE", "server-dev");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify("01900000-0000-7000-8000-000000000001"),
    })
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ name: "서비스" }) })
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ id: "created" }) });
  vi.stubGlobal("fetch", fetch);
  await apiRequest("/api/login", { method: "POST", body: { id: "user", password: "pw" } });
  const body = new FormData();
  body.append("image", new File(["data"], "receipt.pdf", { type: "application/pdf" }));
  await apiRequest("/api/v1/subscriptions/scan", { method: "POST", body });
  expect(fetch.mock.calls[1][0]).toBe("/api/v1/subscriptions/scan");
  expect(fetch.mock.calls[1][1].body).toBe(body);
  expect(fetch.mock.calls[1][1].headers["Content-Type"]).toBeUndefined();
  expect(fetch.mock.calls[1][1].headers["X-Member-Id"]).toBe(
    "01900000-0000-7000-8000-000000000001",
  );
  const draft = {
    name: "서비스",
    amount: 100,
    categoryId: 3,
    presetId: 2,
    billingCycle: "MONTHLY",
    startDate: "2026-11-01",
  };
  await apiRequest("/api/v1/subscriptions", { method: "POST", receiptDraft: true, body: draft });
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(draft);
  fetch.mockResolvedValueOnce({ ok: true, text: async () => "" });
  await apiRequest("/api/logout", { method: "POST" });
});
