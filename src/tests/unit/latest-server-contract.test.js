import { beforeEach, afterEach, expect, it, vi } from "vitest";
const member = "01900000-0000-7000-8000-000000000001";
const id = "01900000-0000-7000-8000-000000000002";
const base = {
  id,
  name: "넷플릭스",
  categoryId: 1,
  amount: 17000,
  currency: "KRW",
  billingCycle: "MONTHLY",
  cycleInterval: 1,
  monthlyAmount: 17000,
  startDate: "2026-01-31",
  billingDay: 31,
  nextBillingDate: "2026-11-30",
  status: "ACTIVE",
  memo: "기존 메모",
  cardId: 8,
  presetId: 7,
  notifyEnabled: false,
  notifyDaysBefore: 3,
};
let fetch, raw, checks, budget, reminder;
const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(data),
});
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("VITE_API_MODE", "server-dev");
  vi.stubEnv("VITE_SERVER_CATEGORY_IDS", "{}");
  raw = { ...base };
  checks = [];
  budget = 100000;
  reminder = 3;
  fetch = vi.fn(async (path, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    if (path === "/auth/login") return response(member);
    if (path === "/users/me") return response({ memberId: member, memberName: "member" });
    if (path === "/users/getMyInfo")
      return response({
        memberId: member,
        memberName: "member",
        name: "이름",
        email: null,
        phone: null,
        monthlyBudget: budget,
        defaultNotificationDays: reminder,
        notificationTime: "10:30:00",
      });
    if (path === "/users/monthly-budget") {
      budget = body.monthlyBudget;
      return response(null);
    }
    if (path === "/users/notification-settings") {
      reminder = body.defaultNotificationDays;
      return response(null);
    }
    if (path === "/usage") return response(checks);
    if (path === `/usage/${id}`) {
      checks = [{ subscriptionId: id, usageLevel: body.usageLevel, checkedOn: "2026-11-15" }];
      return response(checks[0]);
    }
    if (path === "/api/v1/subscriptions")
      return response(options.method === "POST" ? { ...raw, ...body } : [raw]);
    if (path === `/api/v1/subscriptions/${id}`) {
      if (options.method === "PUT") raw = { ...raw, ...body };
      return response(raw);
    }
    if (path.startsWith("/payment/monthly?")) {
      const month = new URL(path, "http://local").searchParams.get("yearMonth");
      const payments =
        month === "2026-11"
          ? [
              {
                subscriptionId: id,
                subscriptionName: raw.name,
                categoryId: 1,
                billedOn: "2026-11-01",
                amount: 9000,
              },
            ]
          : [];
      return response({
        yearMonth: month,
        totalAmount: payments.length * 9000,
        count: payments.length,
        payments,
      });
    }
    if (path === `/payment/subscription/${id}?limit=24`)
      return response([
        {
          subscriptionId: id,
          subscriptionName: raw.name,
          categoryId: 1,
          billedOn: "2026-11-01",
          amount: 9000,
        },
      ]);
    throw new Error(`Unexpected API: ${path}`);
  });
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function api() {
  const { apiRequest } = await import("../../shared/api/apiClient");
  await apiRequest("/api/login", { method: "POST", body: { id: "member", password: "pw" } });
  return apiRequest;
}
it("uses only the latest server's existing paths for session, subscriptions and summaries", async () => {
  const req = await api();
  expect(await req("/api/me")).toEqual({ id: member });
  expect((await req("/api/v1/subscriptions"))[0]).toMatchObject({
    category: "OTT/영상",
    status: "active",
  });
  expect(await req("/api/v1/expenses/summary")).toMatchObject({
    monthlyTotal: 17000,
    subscriptionCount: 1,
  });
  expect(fetch.mock.calls.some(([p]) => p.startsWith("/api/web/"))).toBe(false);
  for (const [path, options] of fetch.mock.calls)
    if (path !== "/auth/login") expect(options.headers["X-Member-Id"]).toBe(member);
});
it("stores review with usage, preserving the actual status and subscription details", async () => {
  const req = await api();
  const row = (await req("/api/v1/subscriptions"))[0];
  expect(
    await req(`/api/v1/subscriptions/${id}`, {
      method: "PUT",
      reviewOnly: true,
      body: { ...row, status: "review" },
    }),
  ).toMatchObject({ status: "review", usageLevel: "RARELY" });
  expect(raw).toEqual(base);
  expect(
    fetch.mock.calls.filter(([p, o]) => p.includes("subscriptions") && o.method === "PUT"),
  ).toHaveLength(0);
  expect((await req("/api/v1/subscriptions"))[0].status).toBe("review");
  expect(await req("/api/v1/savings/summary")).toEqual({
    monthlyReviewSavings: 17000,
    annualPotentialSavings: 204000,
  });
});
it("a usage failure does not hide successfully loaded subscriptions", async () => {
  const req = await api();
  const implementation = fetch.getMockImplementation();
  fetch.mockImplementation((path, opts) =>
    path === "/usage"
      ? Promise.resolve(response({ detail: "unavailable" }, 503))
      : implementation(path, opts),
  );
  expect((await req("/api/v1/subscriptions"))[0]).toMatchObject({ id, usageAvailable: false });
  await expect(req("/api/v1/savings/summary")).rejects.toThrow("사용량");
});
it("maps actual billed amounts instead of deriving historical payments from current prices", async () => {
  const req = await api();
  expect(await req("/api/v1/payments?month=2026-11")).toEqual([
    expect.objectContaining({ amount: 9000, paidOn: "2026-11-01", description: "넷플릭스" }),
  ]);
  const report = await req("/api/v1/reports/monthly?month=2026-11");
  expect(report).toMatchObject({ total: 9000, paymentCount: 1, hasPrevious: false });
  expect(report.history).toHaveLength(6);
  expect(report.categories).toEqual([{ category: "OTT/영상", amount: 9000 }]);
});
it("saves budget and reminders through existing member endpoints", async () => {
  const req = await api();
  expect(await req("/api/data/setting-budget")).toEqual({ json: '"100000"' });
  await req("/api/data/setting-budget", { method: "PUT", body: { json: '"200000"' } });
  expect(budget).toBe(200000);
  await req("/api/data/setting-reminder-days", { method: "PUT", body: { json: "7" } });
  expect(reminder).toBe(7);
  const write = fetch.mock.calls.find(([p]) => p === "/users/notification-settings");
  expect(JSON.parse(write[1].body)).toMatchObject({ notificationTime: "10:30:00" });
});
it("loads recent payments and saves notes using the existing memo field", async () => {
  const req = await api();
  const detail = await req(`/api/v1/subscriptions/${id}/detail`);
  expect(detail).toMatchObject({
    totalPaid: 9000,
    paymentLimit: 24,
    changesSupported: false,
    note: "기존 메모",
  });
  await req(`/api/v1/subscriptions/${id}/note`, { method: "PUT", body: { note: "새 메모" } });
  expect(raw).toMatchObject({ memo: "새 메모", cardId: 8, presetId: 7, notifyEnabled: false });
});
it("rejects unavailable writes and community before contacting the server", async () => {
  const req = await api();
  fetch.mockClear();
  for (const path of ["/api/v1/community/posts", "/api/v1/payments", "/api/social/start"])
    await expect(req(path, { method: "POST", body: {} })).rejects.toMatchObject({
      code: "API_NOT_AVAILABLE",
    });
  expect(fetch).not.toHaveBeenCalled();
});
it("projects month ends and interval cycles without inventing payment records", async () => {
  const { projectedEvents } = await import("../../shared/lib/billingCalendar");
  const monthly = { ...base, cycle: "monthly", status: "active", category: "OTT/영상" };
  expect(projectedEvents([monthly], "2026-02")[0].date).toBe("2026-02-28");
  expect(projectedEvents([monthly], "2026-03")[0].date).toBe("2026-03-31");
  expect(projectedEvents([{ ...monthly, cycleInterval: 2 }], "2026-02")).toEqual([]);
  expect(projectedEvents([{ ...monthly, status: "paused" }], "2026-02")).toEqual([]);
  expect(
    projectedEvents(
      [{ ...monthly, cycle: "yearly", startDate: "2024-02-29", billingDay: 29 }],
      "2025-02",
    )[0].date,
  ).toBe("2025-02-28");
});

it("creates a trial through the existing subscription endpoint", async () => {
  const req = await api();
  const result = await req("/api/v1/trials", {
    method: "POST",
    body: {
      name: "체험",
      category: "영상",
      amount: 5000,
      endDate: "2027-12-31",
      notifyDays: 3,
      status: "ACTIVE",
    },
  });
  expect(result.status).toBe("ACTIVE");
  const call = fetch.mock.calls.find(
    ([path, opts]) => path === "/api/v1/subscriptions" && opts.method === "POST",
  );
  expect(JSON.parse(call[1].body)).toMatchObject({
    status: "TRIAL",
    trialEndDate: "2027-12-31",
    categoryId: 1,
  });
});
it("generates due alerts from server data and stores reads locally without server writes", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-29T12:00:00Z"));
  try {
    raw.notifyEnabled = true;
    const req = await api();
    const alerts = await req("/api/v1/notifications");
    const bill = alerts.find((x) => x.id.startsWith("bill:"));
    expect(bill).toBeTruthy();
    await req(`/api/v1/notifications/${bill.id}/read`, { method: "POST" });
    expect((await req("/api/v1/notifications")).find((x) => x.id === bill.id).read).toBe(true);
    await req(`/api/v1/notifications/${bill.id}`, { method: "DELETE" });
    expect((await req("/api/v1/notifications")).some((x) => x.id === bill.id)).toBe(false);
    expect(
      fetch.mock.calls.filter(
        ([path, options]) => path !== "/auth/login" && options.method !== "GET",
      ),
    ).toHaveLength(0);
  } finally {
    vi.useRealTimers();
  }
});
it("maps My Page usage checks to the unchanged server usage endpoint", async () => {
  const req = await api();
  await req(`/api/v1/usage/${id}`, { method: "PUT", body: { usageLevel: "NEVER" } });
  const call = fetch.mock.calls.find(
    ([path, options]) => path === `/usage/${id}` && options.method === "PUT",
  );
  expect(JSON.parse(call[1].body)).toEqual({ usageLevel: "NEVER" });
  const before = fetch.mock.calls.length;
  await expect(
    req(`/api/v1/usage/${id}`, { method: "PUT", body: { usageLevel: "invalid" } }),
  ).rejects.toThrow("사용 정도");
  expect(fetch.mock.calls.length).toBe(before);
});
