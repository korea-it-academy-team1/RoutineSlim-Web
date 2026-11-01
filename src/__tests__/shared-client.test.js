import { afterEach, expect, it, vi } from "vitest";
import {
  createRoutineSlimApiClient,
  RoutineSlimApiError,
} from "../global/api/routineSlimApiClient";
const MEMBER = "12345678-1234-1234-1234-123456789012";
const SUB = "87654321-4321-4321-4321-210987654321";
const ok = (value) => ({ ok: true, status: 200, text: async () => JSON.stringify(value) });
afterEach(() => vi.unstubAllGlobals());
it("works without browser globals and accepts app-style member credentials", async () => {
  vi.stubGlobal("window", undefined);
  vi.stubGlobal("document", undefined);
  vi.stubGlobal("localStorage", undefined);
  vi.stubGlobal("sessionStorage", undefined);
  const fetchImpl = vi.fn().mockResolvedValue(ok(MEMBER));
  const client = createRoutineSlimApiClient({ baseUrl: "http://10.0.2.2:8080", fetchImpl });
  expect(await client.login({ memberName: "sample", memberPassword: "not-stored" })).toBe(MEMBER);
  expect(fetchImpl.mock.calls[0][0]).toBe("http://10.0.2.2:8080/auth/login");
});
it("keeps native server status and billing enums intact for app and web consumers", async () => {
  const rows = [
    { id: SUB, status: "PAUSED", billingCycle: "YEARLY", categoryId: 4, cycleInterval: 2 },
  ];
  const fetchImpl = vi.fn().mockResolvedValue(ok(rows));
  const client = createRoutineSlimApiClient({ fetchImpl, getMemberId: () => MEMBER });
  expect(await client.listSubscriptions("PAUSED")).toEqual(rows);
  expect(fetchImpl.mock.calls[0][0]).toBe("/api/v1/subscriptions?status=PAUSED");
  expect(fetchImpl.mock.calls[0][1].headers["X-Member-Id"]).toBe(MEMBER);
});
it("keeps different app and web sessions isolated", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(ok([]));
  const a = createRoutineSlimApiClient({ fetchImpl, getMemberId: () => MEMBER });
  const b = createRoutineSlimApiClient({ fetchImpl, getMemberId: () => SUB });
  await a.listSubscriptions();
  await b.listSubscriptions();
  expect(fetchImpl.mock.calls[0][1].headers["X-Member-Id"]).toBe(MEMBER);
  expect(fetchImpl.mock.calls[1][1].headers["X-Member-Id"]).toBe(SUB);
});
it("passes FormData through without forcing a JSON or multipart boundary header", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(ok({ name: null, amount: null }));
  const client = createRoutineSlimApiClient({ fetchImpl, getMemberId: () => MEMBER });
  const form = new FormData();
  form.append("image", new Blob(["test"], { type: "image/png" }), "receipt.png");
  await client.scanReceipt(form);
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url).toBe("/api/v1/subscriptions/scan");
  expect(options.body).toBe(form);
  expect(options.headers["Content-Type"]).toBeUndefined();
});
it("keeps cancellation an explicit status operation", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(ok({ id: SUB, status: "CANCELED" }));
  const client = createRoutineSlimApiClient({ fetchImpl, getMemberId: () => MEMBER });
  await client.changeSubscriptionStatus(SUB, { status: "CANCELED" });
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url).toBe(`/api/v1/subscriptions/${SUB}/status`);
  expect(options.method).toBe("PATCH");
  expect(JSON.parse(options.body)).toEqual({ status: "CANCELED" });
});
it("exposes error status and network codes consistently across platforms", async () => {
  const denied = vi
    .fn()
    .mockResolvedValue({ ok: false, status: 401, text: async () => '{"message":"로그인 만료"}' });
  const unauthorized = vi.fn();
  const client = createRoutineSlimApiClient({
    fetchImpl: denied,
    getMemberId: () => MEMBER,
    onUnauthorized: unauthorized,
  });
  await expect(client.listSubscriptions()).rejects.toMatchObject({
    status: 401,
    code: "HTTP_401",
    message: "로그인 만료",
  });
  expect(unauthorized).toHaveBeenCalledWith(401);
  const offline = createRoutineSlimApiClient({
    fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
    getMemberId: () => MEMBER,
  });
  await expect(offline.listSubscriptions()).rejects.toBeInstanceOf(RoutineSlimApiError);
  await expect(offline.listSubscriptions()).rejects.toMatchObject({
    status: 0,
    code: "NETWORK_ERROR",
  });
});

it("shows Spring ProblemDetail errors without losing the HTTP status", async () => {
  const client = createRoutineSlimApiClient({
    getMemberId: () => MEMBER,
    fetchImpl: vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "기준일을 확인해주세요.",
        }),
    }),
  });
  await expect(client.listSubscriptions()).rejects.toMatchObject({
    message: "기준일을 확인해주세요.",
    status: 400,
    code: "HTTP_400",
  });
});
