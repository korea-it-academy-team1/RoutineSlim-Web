import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "../App";
import { request } from "../api/apiClient";
vi.mock("../api/apiClient", () => ({
  request: vi.fn(),
  money: (n) => Number(n || 0).toLocaleString("ko-KR") + "원",
  today: () => "2026-10-24",
}));
afterEach(() => {
  cleanup();
  request.mockReset();
  window.history.replaceState({}, "", "/");
});
function api(path) {
  if (path === "/api/me") return { id: "member" };
  if (path.endsWith("/moderation")) return { admin: true };
  if (path.includes("/setting-")) return { json: "7" };
  if (path.includes("/expenses/summary"))
    return {
      monthlyTotal: 0,
      annualTotal: 0,
      subscriptionCount: 0,
      byCategory: {},
    };
  if (path.includes("/savings/summary")) return { annualPotentialSavings: 0 };
  if (path.includes("/reports/monthly"))
    return {
      total: 0,
      previousTotal: 0,
      hasPrevious: false,
      paymentCount: 0,
      categories: [],
      history: [],
    };
  if (path.includes("/goals?"))
    return { goal: null, entries: [], saved: 0, percent: 0 };
  if (path.endsWith("/activity/me"))
    return { posts: [], comments: [], likes: [] };
  if (path.endsWith("/admin/overview"))
    return { members: 1, posts: 0, reports: 0, openInquiries: 0 };
  if (path.includes("/admin/members")) return { content: [], total: 0 };
  return [];
}
it("all new pages are reachable through the actual app navigation", async () => {
  request.mockImplementation(async (path) => api(path));
  render(<App />);
  await screen.findByRole("heading", { name: "내 구독 한눈에 보기" });
  for (const [label, title] of [
    ["무료체험 관리", "무료체험 관리"],
    ["월간 결산", "월간 결산"],
    ["구독 비교", "구독 비교"],
    ["절약 목표 · 챌린지", "절약 목표 · 챌린지"],
    ["내 활동", "내 활동"],
    ["고객센터", "고객센터"],
    ["알림센터", "알림센터"],
    ["관리자 대시보드", "관리자 대시보드"],
  ]) {
    fireEvent.click(
      screen.getAllByRole("button", { name: label, exact: true })[0],
    );
    await screen.findByRole("heading", { name: title, level: 1 });
  }
  fireEvent.click(
    screen.getByRole("button", { name: "서비스 소개", exact: true }),
  );
  await screen.findByRole("heading", { name: /흩어진 구독은 한곳에/ });
  expect(screen.queryByRole("alert")).toBeNull();
});
it("guests can open the public introduction and customer center", async () => {
  request.mockImplementation(async (path) => {
    if (path === "/api/me") throw Error("Unauthorized");
    if (path.endsWith("/providers")) return {};
    return [];
  });
  render(<App />);
  await screen.findByRole("heading", { name: "로그인", exact: true });
  fireEvent.click(screen.getByRole("button", { name: "서비스 소개" }));
  await screen.findByRole("heading", { name: /흩어진 구독은 한곳에/ });
  fireEvent.click(
    screen.getAllByRole("button", { name: "고객센터", exact: true })[0],
  );
  await screen.findByRole("heading", { name: "고객센터", level: 1 });
  expect(
    screen.getByRole("button", { name: "로그인 후 문의하기" }),
  ).toBeTruthy();
});
