import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ReceiptScanPage from "../../features/receipts/pages/ReceiptScanPage";
import { apiRequest } from "../../shared/api/apiClient";
vi.mock("../../shared/api/apiClient", () => ({ apiRequest: vi.fn() }));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
});
function choose(file = new File(["receipt"], "receipt.pdf", { type: "application/pdf" })) {
  fireEvent.change(screen.getByLabelText("파일 선택"), { target: { files: [file] } });
}
it("uploads multipart image, edits the draft, and only saves after confirmation", async () => {
  apiRequest
    .mockResolvedValueOnce({
      name: "서비스",
      amount: 12000,
      categoryId: 3,
      presetId: 2,
      billingCycle: "MONTHLY",
      startDate: "2026-11-01",
      recognized: { storeName: "상호", itemNames: ["이용료"] },
    })
    .mockResolvedValueOnce({ id: "saved" });
  const navigate = vi.fn();
  render(<ReceiptScanPage navigate={navigate} />);
  choose();
  fireEvent.click(screen.getByRole("button", { name: "영수증 인식하기" }));
  await waitFor(() => expect(screen.getByLabelText("서비스명").value).toBe("서비스"));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest.mock.calls[0][0]).toBe("/api/v1/subscriptions/scan");
  expect(apiRequest.mock.calls[0][1].body.get("image").name).toBe("receipt.pdf");
  fireEvent.change(screen.getByLabelText("서비스명"), { target: { value: "수정 서비스" } });
  fireEvent.click(screen.getByRole("button", { name: "확인하고 구독 등록" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("등록되었습니다"));
  expect(apiRequest).toHaveBeenLastCalledWith(
    "/api/v1/subscriptions",
    expect.objectContaining({
      method: "POST",
      receiptDraft: true,
      body: expect.objectContaining({
        name: "수정 서비스",
        categoryId: 3,
        presetId: 2,
        amount: 12000,
        startDate: "2026-11-01",
      }),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "구독 목록 보기" }));
  expect(navigate).toHaveBeenCalledWith("subscriptions");
});
it("rejects unsupported and oversized files without a request", () => {
  render(<ReceiptScanPage />);
  choose(new File(["x"], "bad.svg", { type: "image/svg+xml" }));
  expect(screen.getByRole("alert").textContent).toContain("JPG");
  const large = new File(["x"], "large.pdf", { type: "application/pdf" });
  Object.defineProperty(large, "size", { value: 10 * 1024 * 1024 + 1 });
  choose(large);
  expect(screen.getByRole("alert").textContent).toContain("10MB");
  expect(apiRequest).not.toHaveBeenCalled();
});
it("shows OCR setup errors and allows retry", async () => {
  apiRequest.mockRejectedValue(Object.assign(new Error("HTTP error"), { status: 503 }));
  render(<ReceiptScanPage />);
  choose();
  fireEvent.click(screen.getByRole("button", { name: "영수증 인식하기" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("설정되지"));
  expect(screen.getByRole("button", { name: "영수증 인식하기" }).disabled).toBe(false);
});
it("leaves unrecognized values empty for manual entry", async () => {
  apiRequest.mockResolvedValue({ name: null, amount: null, categoryId: null, startDate: null });
  render(<ReceiptScanPage />);
  choose();
  fireEvent.click(screen.getByRole("button", { name: "영수증 인식하기" }));
  await waitFor(() => expect(screen.getByLabelText("서비스명").value).toBe(""));
  expect(screen.getByLabelText("결제 금액 (원)").value).toBe("");
  expect(screen.getByLabelText("카테고리 ID").value).toBe("");
});
