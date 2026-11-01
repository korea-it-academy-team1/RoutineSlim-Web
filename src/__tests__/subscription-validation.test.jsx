import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SubscriptionEditor from "../domain/subscription/SubscriptionEditor";
import { apiRequest } from "../global/api/apiClient";
vi.mock("../global/api/apiClient", () => ({
  apiRequest: vi.fn(),
  getTodayDate: () => "2026-11-01",
}));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
});
const base = {
  id: "1",
  name: "내 구독",
  category: "영상",
  amount: 12000,
  cycle: "monthly",
  day: 1,
  status: "active",
  billingAnchorDate: "2026-11-01",
};
it.each([
  [{ name: "   " }, "항목 이름"],
  [{ name: "가".repeat(101) }, "항목 이름"],
  [{ amount: "" }, "결제 금액"],
  [{ amount: -1 }, "결제 금액"],
  [{ amount: 1.5 }, "결제 금액"],
  [{ amount: 2147483648 }, "결제 금액"],
  [{ day: 0 }, "결제일"],
  [{ day: 1.5 }, "결제일"],
  [{ billingAnchorDate: "2026-02-30" }, "기준일"],
])("blocks invalid form values before sending a save request: %j", async (patch, message) => {
  apiRequest.mockResolvedValue([]);
  const onSaved = vi.fn();
  render(
    <SubscriptionEditor
      subscription={{ ...base, ...patch }}
      onClose={() => {}}
      onSaved={onSaved}
    />,
  );
  fireEvent.submit(screen.getByRole("button", { name: "저장", exact: true }).closest("form"));
  expect(screen.getByRole("alert").textContent).toContain(message);
  expect(apiRequest.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
});
it("keeps entered data after a server failure and allows a retry", async () => {
  let saves = 0;
  apiRequest.mockImplementation(async (path, options) => {
    if (!options?.method) return [];
    if (++saves === 1) throw new Error("저장 실패");
    return { ...base, ...options.body };
  });
  const onSaved = vi.fn();
  render(<SubscriptionEditor subscription={base} onClose={() => {}} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("결제 금액 (원)"), { target: { value: "19000" } });
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await screen.findByText("저장 실패");
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByLabelText("결제 금액 (원)").value).toBe("19000");
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await waitFor(() =>
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ amount: 19000 })),
  );
  expect(saves).toBe(2);
});
it("does not report an empty server response as a successful save", async () => {
  apiRequest.mockImplementation(async (path, options) => (options?.method ? null : []));
  const onSaved = vi.fn();
  render(<SubscriptionEditor subscription={base} onClose={() => {}} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await screen.findByText(/서버의 저장 결과/);
  expect(onSaved).not.toHaveBeenCalled();
});
it("accepts a zero-cost subscription and preserves its date and cycle", async () => {
  apiRequest.mockImplementation(async (path, options) =>
    options?.method ? { ...base, ...options.body } : [],
  );
  const onSaved = vi.fn();
  render(
    <SubscriptionEditor
      subscription={{ ...base, amount: 0, cycle: "yearly" }}
      onClose={() => {}}
      onSaved={onSaved}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await waitFor(() =>
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0, cycle: "yearly", billingAnchorDate: "2026-11-01" }),
    ),
  );
});
