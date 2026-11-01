import React, { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Modal, Status } from "../global/components/SharedUI";
import AppErrorBoundary from "../global/components/AppErrorBoundary";
import { useApiResource } from "../global/useApiResource";
import { apiRequest } from "../global/api/apiClient";
import AppLayout from "../global/components/AppLayout";
import PaymentHistoryPage from "../domain/payment/PaymentHistoryPage";
vi.mock("../global/api/apiClient", () => ({
  apiRequest: vi.fn(),
  formatWon: (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`,
  getTodayDate: () => "2026-11-01",
}));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
  vi.restoreAllMocks();
});
function ResourceDemo() {
  const resource = useApiResource("/api/v1/example");
  return (
    <>
      <Status resource={resource} />
      {resource.data && <p>{resource.data.label}</p>}
    </>
  );
}
it("lets users recover from a failed read with an explicit retry", async () => {
  apiRequest
    .mockRejectedValueOnce(new Error("잠시 연결이 끊겼습니다."))
    .mockResolvedValueOnce({ label: "다시 불러왔습니다." });
  render(<ResourceDemo />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await screen.findByText("다시 불러왔습니다.");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(apiRequest).toHaveBeenCalledTimes(2);
});
it("does not offer pointless retries for a server feature that is not available", async () => {
  apiRequest.mockRejectedValue(
    Object.assign(new Error("현재 연결된 서버에서 이 기능을 지원하지 않습니다."), {
      code: "API_NOT_AVAILABLE",
    }),
  );
  render(<ResourceDemo />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "다시 불러오기" })).toBeNull();
});
it("clears previous errors when a resource is no longer selected", async () => {
  apiRequest.mockRejectedValue(new Error("이전 화면 오류"));
  const { result, rerender } = renderHook(({ path }) => useApiResource(path), {
    initialProps: { path: "/api/v1/a" },
  });
  await waitFor(() => expect(result.current.error).toBe("이전 화면 오류"));
  rerender({ path: null });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe("");
  expect(result.current.data).toBeNull();
});
it("ignores an older response arriving after navigation", async () => {
  let first;
  apiRequest.mockImplementation((path) =>
    path === "/api/v1/a"
      ? new Promise((resolve) => {
          first = resolve;
        })
      : Promise.resolve({ label: "B" }),
  );
  const { result, rerender } = renderHook(({ path }) => useApiResource(path), {
    initialProps: { path: "/api/v1/a" },
  });
  rerender({ path: "/api/v1/b" });
  await waitFor(() => expect(result.current.data).toEqual({ label: "B" }));
  await act(async () => first({ label: "A" }));
  expect(result.current.data).toEqual({ label: "B" });
});
it("prevents two concurrent writes through the shared resource hook", async () => {
  apiRequest.mockResolvedValue({});
  const { result } = renderHook(() => useApiResource("/api/v1/a"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let finish;
  const work = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let pending;
  act(() => {
    pending = result.current.run(work);
  });
  let duplicate;
  await act(async () => {
    duplicate = await result.current.run(work);
  });
  expect(duplicate).toBe(false);
  expect(work).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
    await pending;
  });
  expect(result.current.busy).toBe(false);
});
it("focuses editable modal content, traps Tab and restores focus on Escape", () => {
  function Demo() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>창 열기</button>
        {open && (
          <Modal title="입력" onClose={() => setOpen(false)}>
            <input aria-label="비활성" disabled />
            <input aria-label="이름" />
            <button>확인</button>
          </Modal>
        )}
      </>
    );
  }
  render(<Demo />);
  const opener = screen.getByRole("button", { name: "창 열기" });
  opener.focus();
  fireEvent.click(opener);
  expect(document.activeElement).toBe(screen.getByLabelText("이름"));
  const last = screen.getByRole("button", { name: "확인" });
  last.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "닫기" }));
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
it("shows a recovery action instead of a blank screen after a rendering error", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let broken = true;
  function Content() {
    if (broken) throw new Error("Expected test failure");
    return <p>화면 복구 완료</p>;
  }
  render(
    <AppErrorBoundary>
      <Content />
    </AppErrorBoundary>,
  );
  expect(screen.getByRole("alert").textContent).toContain("화면을 표시하지 못했습니다");
  broken = false;
  fireEvent.click(screen.getByRole("button", { name: "화면 다시 열기" }));
  expect(screen.getByText("화면 복구 완료")).toBeTruthy();
});
it.each(["12345678-1234-1234-1234-123456789012", 7])(
  "preserves the subscription ID type when recording a payment (%s)",
  async (id) => {
    apiRequest.mockImplementation(async (path, options) => {
      if (path === "/api/v1/subscriptions") return [{ id, name: "연결할 서비스" }];
      if (path.includes("/reports/")) return { history: [] };
      if (options?.method) return { id: "payment", ...options.body };
      return [];
    });
    render(<PaymentHistoryPage />);
    await screen.findByRole("option", { name: "연결할 서비스" });
    fireEvent.change(screen.getByLabelText("연결할 구독"), { target: { value: String(id) } });
    fireEvent.change(screen.getByLabelText("결제 항목"), { target: { value: "월 결제" } });
    fireEvent.change(screen.getByLabelText("금액", { exact: true }), {
      target: { value: "12000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "등록", exact: true }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("/api/v1/payments", {
        method: "POST",
        body: { subscriptionId: id, description: "월 결제", amount: 12000, paidOn: "2026-11-01" },
      }),
    );
  },
);

it("does not display a technical member UUID as a profile name", async () => {
  apiRequest.mockImplementation(async (path) =>
    path.includes("setting-")
      ? { json: "7" }
      : path.includes("expenses")
        ? { monthlyTotal: 0, subscriptionCount: 0, byCategory: {} }
        : path.includes("savings")
          ? { monthlyReviewSavings: 0 }
          : [],
  );
  const memberId = "12345678-1234-1234-1234-123456789012";
  render(
    <AppLayout user={memberId} page="dashboard" setPage={() => {}} onLogout={() => {}}>
      <p>테스트 화면</p>
    </AppLayout>,
  );
  expect(screen.queryByText(memberId, { exact: true })).toBeNull();
  expect(screen.getAllByText(/회원/).length).toBeGreaterThan(0);
  await waitFor(() => expect(apiRequest).toHaveBeenCalled());
});
