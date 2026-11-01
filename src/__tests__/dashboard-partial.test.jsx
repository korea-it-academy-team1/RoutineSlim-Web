import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DashboardPage from "../domain/stats/DashboardPage";
import { apiRequest } from "../global/api/apiClient";
vi.mock("../global/api/apiClient", () => ({
  apiRequest: vi.fn(),
  formatWon: (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`,
  getTodayDate: () => "2026-11-01",
}));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
});
const subscription = {
  id: "uuid",
  name: "실제 등록 구독",
  category: "영상",
  amount: 12000,
  cycle: "monthly",
  status: "active",
};
it("keeps available subscriptions visible when another dashboard API fails", async () => {
  apiRequest.mockImplementation(async (path) => {
    if (path === "/api/v1/subscriptions") return [subscription];
    throw new Error("지원되지 않음");
  });
  render(<DashboardPage navigate={() => {}} />);
  await screen.findByText("실제 등록 구독");
  expect(screen.getByRole("alert").textContent).toContain("일부 정보");
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  expect(screen.queryByText("0원")).toBeNull();
  expect(screen.getByText("1개")).toBeTruthy();
});
it("reloads partial data and clears the warning once all APIs recover", async () => {
  let failing = true;
  apiRequest.mockImplementation(async (path) => {
    if (path === "/api/v1/subscriptions") return [subscription];
    if (failing) throw new Error("임시 오류");
    if (path.includes("/expenses/"))
      return { monthlyTotal: 12000, annualTotal: 144000, subscriptionCount: 1 };
    if (path.includes("/savings/")) return { annualPotentialSavings: 0 };
    return { history: [] };
  });
  render(<DashboardPage navigate={() => {}} />);
  await screen.findByRole("alert");
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(screen.getByText("144,000원")).toBeTruthy();
});
it("distinguishes a failed subscription read from a genuine empty list", async () => {
  apiRequest.mockRejectedValue(new Error("조회 실패"));
  render(<DashboardPage navigate={() => {}} />);
  await screen.findByText("구독 목록을 불러오지 못했습니다.");
  expect(screen.queryByText("첫 구독을 등록해보세요")).toBeNull();
});
