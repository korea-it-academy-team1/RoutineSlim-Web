import { beforeEach, expect, it, vi } from "vitest";
import {
  readBrowserData,
  requestBrowserData,
  applyNotificationState,
} from "../../shared/storage/browserDataStore";
const member = "member-a",
  other = "member-b";
const request = (path, method = "GET", body, owner = member) => {
  const u = new URL(path, "http://local");
  return requestBrowserData(owner, u.pathname, method, body, u.searchParams);
};
const model = {
  title: "절약",
  month: "2026-11",
  target: 30000,
  tasks: ["구독 확인"],
  completed: [false],
};
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
it("stores goals/checklists/entries per account and recalculates progress", () => {
  const goal = request("/api/v1/goals", "POST", model);
  request(`/api/v1/goals/${goal.id}/savings`, "POST", {
    title: "요금 조정",
    amount: 10000,
    date: "2026-11-15",
  });
  request(`/api/v1/goals/${goal.id}`, "PUT", { ...model, completed: [true] });
  expect(request("/api/v1/goals?month=2026-11")).toMatchObject({
    saved: 10000,
    percent: 33,
    goal: { completed: [true] },
  });
  expect(request("/api/v1/goals?month=2026-11", "GET", null, other).goal).toBeNull();
  const entry = request("/api/v1/goals?month=2026-11").entries[0];
  request(`/api/v1/savings-entries/${entry.id}`, "DELETE");
  expect(request("/api/v1/goals?month=2026-11").saved).toBe(0);
  request(`/api/v1/goals/${goal.id}`, "DELETE");
  expect(readBrowserData(member).goals).toEqual([]);
});
it("invalid writes do not alter stored goals", () => {
  const goal = request("/api/v1/goals", "POST", model),
    before = JSON.stringify(readBrowserData(member));
  expect(() =>
    request(`/api/v1/goals/${goal.id}/savings`, "POST", {
      title: "다른 달",
      amount: 10,
      date: "2026-12-01",
    }),
  ).toThrow("날짜");
  expect(() => request("/api/v1/goals", "POST", model)).toThrow();
  expect(() => request(`/api/v1/goals/${goal.id}`, "PUT", { ...model, target: -1 })).toThrow();
  expect(JSON.stringify(readBrowserData(member))).toBe(before);
});
it("round trips a backup and rejects corrupt or other-account imports before changing data", () => {
  request("/api/v1/goals", "POST", model);
  const backup = request("/api/v1/browser-data");
  expect(() => request("/api/v1/browser-data", "PUT", { ...backup, memberId: other })).toThrow(
    "계정",
  );
  expect(() =>
    request("/api/v1/browser-data", "PUT", {
      ...backup,
      data: { ...backup.data, goals: [{ ...backup.data.goals[0], target: 0 }] },
    }),
  ).toThrow();
  expect(readBrowserData(member).goals).toHaveLength(1);
  request(`/api/v1/goals/${backup.data.goals[0].id}`, "DELETE");
  request("/api/v1/browser-data", "PUT", backup);
  expect(readBrowserData(member).goals).toHaveLength(1);
});
it("persists notification read/dismiss state independently for each member", () => {
  const items = [
    { id: "bill:1:2026-11-15", title: "결제" },
    { id: "trial:2", title: "체험" },
  ];
  applyNotificationState(member, items, "read", items[0].id);
  expect(applyNotificationState(member, items)[0].read).toBe(true);
  expect(applyNotificationState(other, items)[0].read).toBe(false);
  applyNotificationState(member, items, "delete", items[1].id);
  expect(applyNotificationState(member, items)).toHaveLength(1);
});
it("reports storage failure and preserves existing contents", () => {
  request("/api/v1/goals", "POST", model);
  const before = localStorage.getItem("routineslim:browser-data:v1:" + member);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  expect(() => request("/api/v1/comparison/selection", "PUT", { ids: ["abc"] })).toThrow(
    "저장하지 못했습니다",
  );
  expect(localStorage.getItem("routineslim:browser-data:v1:" + member)).toBe(before);
});
it("rejects corrupted storage rather than resetting and overwriting it", () => {
  localStorage.setItem("routineslim:browser-data:v1:" + member, "broken");
  expect(() => readBrowserData(member)).toThrow("손상");
  expect(localStorage.getItem("routineslim:browser-data:v1:" + member)).toBe("broken");
});
