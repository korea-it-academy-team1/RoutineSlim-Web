import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SavingsScenario from "../../features/savings/components/SavingsScenario";
import SubscriptionComparisonPage from "../../features/subscriptions/pages/SubscriptionComparisonPage";
import PaymentCalendarPage from "../../features/payments/pages/PaymentCalendarPage";
import { apiRequest } from "../../shared/api/apiClient";
import { downloadFile } from "../../shared/lib/downloadFile";
vi.mock("../../shared/api/apiClient", () => ({ apiRequest: vi.fn() }));
vi.mock("../../shared/lib/downloadFile", () => ({ downloadFile: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("simulates choices and exports only the selected rows without saving subscriptions", () => {
  render(
    <SavingsScenario
      subscriptions={[
        { id: 1, name: "영상", amount: 10000, cycle: "monthly", status: "active" },
        { id: 2, name: "음악", amount: 5000, cycle: "monthly", status: "active" },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /영상 비용 제외/ }));
  fireEvent.change(screen.getByLabelText("시뮬레이션 기간"), { target: { value: "3" } });
  expect(screen.getByText("30,000원")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "시뮬레이션 CSV 내보내기" }));
  const csv = downloadFile.mock.calls[0][1];
  expect(csv).toContain('"영상","10000","30000"');
  expect(csv).not.toContain("음악");
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "선택 초기화" }));
  expect(screen.getByRole("checkbox", { name: /영상 비용 제외/ }).checked).toBe(false);
});
it("shows plans without timestamps and filters/sorts their real prices", async () => {
  apiRequest.mockImplementation(async (path) =>
    path.endsWith("selection")
      ? []
      : [
          {
            id: 1,
            service: "Video",
            plan: "Annual",
            category: "영상",
            amount: 12000,
            cycle: "yearly",
            features: ["HD"],
          },
          {
            id: 2,
            service: "Music",
            plan: "Weekly",
            category: "음악",
            amount: 1200,
            cycle: "weekly",
            features: [],
          },
        ],
  );
  render(<SubscriptionComparisonPage />);
  await screen.findByText("Annual");
  expect(screen.getAllByText("정보 수정일 정보 없음")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("정렬"), { target: { value: "price-desc" } });
  expect(screen.getAllByRole("heading", { level: 2 })[0].textContent).toBe("Weekly");
  fireEvent.change(screen.getByLabelText("요금제 검색"), { target: { value: "HD" } });
  expect(screen.queryByText("Weekly")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "비교에 추가" }));
  const comparison = screen.getByRole("table");
  expect(within(comparison).getByText("1,000원")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "비교표 CSV 내보내기" }));
  expect(downloadFile.mock.calls[0][1]).toContain('"Video","Annual","1000","12000"');
  expect(apiRequest.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});
it("exports the whole selected month as calendar events after loading", async () => {
  apiRequest.mockResolvedValue([
    { subscriptionId: "s", name: "영상", category: "영상", amount: 9900, date: "2026-11-20" },
  ]);
  render(<PaymentCalendarPage />);
  const button = screen.getByRole("button", { name: "캘린더 파일 내보내기 (.ics)" });
  expect(button.disabled).toBe(true);
  await screen.findByText("2026-11-20 · 영상");
  fireEvent.click(button);
  expect(downloadFile).toHaveBeenCalledTimes(1);
  expect(downloadFile.mock.calls[0][1]).toContain("DTSTART;VALUE=DATE:20261120");
  expect(apiRequest).toHaveBeenCalledTimes(1);
});

it("does not display an unknown plan price as a free subscription", async () => {
  apiRequest.mockImplementation(async (path) =>
    path.endsWith("selection")
      ? []
      : [
          {
            id: "unknown",
            service: "확인 필요",
            plan: "요금 미등록",
            category: "영상",
            amount: null,
            cycle: "monthly",
          },
        ],
  );
  render(<SubscriptionComparisonPage />);
  await screen.findByText("요금 정보 없음");
  expect(screen.queryByText("0원")).toBeNull();
});
