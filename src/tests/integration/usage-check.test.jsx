import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import UsageCheckPanel from "../../features/usage/components/UsageCheckPanel";
import { apiRequest } from "../../shared/api/apiClient";
vi.mock("../../shared/api/apiClient", () => ({ apiRequest: vi.fn() }));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
});
it("loads only when expanded and saves a usage level through the existing facade", async () => {
  apiRequest.mockImplementation(async (path, options) =>
    options?.method === "PUT"
      ? { subscriptionId: "one", usageLevel: options.body.usageLevel, checkedOn: "2026-11-15" }
      : [
          {
            id: "one",
            name: "넷플릭스",
            status: "active",
            usageLevel: "OFTEN",
            usageAvailable: true,
          },
        ],
  );
  render(<UsageCheckPanel />);
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /사용량 점검/ }));
  fireEvent.click(await screen.findByRole("button", { name: "넷플릭스 거의 안 씀" }));
  await screen.findByText(/사용량을 ‘거의 안 씀’으로 저장했습니다/);
  expect(apiRequest).toHaveBeenCalledWith("/api/v1/usage/one", {
    method: "PUT",
    body: { usageLevel: "RARELY" },
  });
  expect(
    screen.getByRole("button", { name: "넷플릭스 거의 안 씀" }).getAttribute("aria-pressed"),
  ).toBe("true");
});
it("blocks saving when the usage read failed and offers retry", async () => {
  apiRequest.mockResolvedValue([
    { id: "one", name: "넷플릭스", status: "active", usageAvailable: false },
  ]);
  render(<UsageCheckPanel />);
  fireEvent.click(screen.getByRole("button", { name: /사용량 점검/ }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "넷플릭스 자주 사용" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
});
it("restores the previous selection and summary when an instant save fails", async () => {
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === "PUT") throw new Error("저장 실패");
    return [
      {
        id: "one",
        name: "넷플릭스",
        status: "active",
        amount: 17000,
        cycle: "monthly",
        usageLevel: "OFTEN",
        usageCheckedOn: new Date().toISOString().slice(0, 10),
        usageAvailable: true,
      },
    ];
  });
  render(<UsageCheckPanel />);
  fireEvent.click(screen.getByRole("button", { name: /사용량 점검/ }));
  fireEvent.click(await screen.findByRole("button", { name: "넷플릭스 거의 안 씀" }));
  await screen.findByText("저장 실패");
  expect(
    screen.getByRole("button", { name: "넷플릭스 자주 사용" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen.getByRole("button", { name: "넷플릭스 거의 안 씀" }).getAttribute("aria-pressed"),
  ).toBe("false");
  expect(screen.queryByText(/구독을 거의 쓰지 않고/)).toBeNull();
});
