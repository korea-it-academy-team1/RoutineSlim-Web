import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SubscriptionsPage from "../../features/subscriptions/pages/SubscriptionsPage";
import { apiRequest } from "../../shared/api/apiClient";
vi.mock("../../shared/api/apiClient", () => ({ apiRequest: vi.fn() }));
vi.mock("../../shared/lib/format", async () => {
  const actual = await vi.importActual("../../shared/lib/format");
  return { ...actual };
});
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
  vi.unstubAllEnvs();
});
const row = {
  id: "sub",
  name: "서비스",
  category: "영상",
  status: "paused",
  cycle: "monthly",
  day: 1,
  amount: 1000,
};
it("shows inactive subscriptions and saves a changed status", async () => {
  vi.stubEnv("VITE_API_MODE", "server-dev");
  apiRequest.mockImplementation(async (path, options) => {
    return options?.method === "PATCH" ? { ...row, status: "active" } : [row];
  });
  render(<SubscriptionsPage />);
  await screen.findByText("서비스");
  expect(screen.getByText("일시정지", { selector: "span" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "상태 변경" }));
  fireEvent.change(screen.getByLabelText("구독 상태"), { target: { value: "ACTIVE" } });
  fireEvent.click(screen.getByRole("button", { name: "상태 변경 저장" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/subscriptions/sub/status", {
    method: "PATCH",
    body: { status: "ACTIVE", trialEndDate: null },
  });
  expect(screen.getByText("이용 중", { selector: "span" })).toBeTruthy();
});
it("requires and sends the trial end date, preserving the row when a save fails", async () => {
  vi.stubEnv("VITE_API_MODE", "server-dev");
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === "PATCH") throw new Error("상태 변경 실패");
    return [row];
  });
  render(<SubscriptionsPage />);
  await screen.findByText("서비스");
  fireEvent.click(screen.getByRole("button", { name: "상태 변경" }));
  fireEvent.change(screen.getByLabelText("구독 상태"), { target: { value: "TRIAL" } });
  expect(screen.getByLabelText("체험 종료일").required).toBe(true);
  fireEvent.change(screen.getByLabelText("체험 종료일"), { target: { value: "2026-12-01" } });
  fireEvent.click(screen.getByRole("button", { name: "상태 변경 저장" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("실패"));
  expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/subscriptions/sub/status", {
    method: "PATCH",
    body: { status: "TRIAL", trialEndDate: "2026-12-01" },
  });
  expect(screen.getByText("일시정지", { selector: "span" })).toBeTruthy();
});
