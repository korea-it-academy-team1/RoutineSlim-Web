import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import { request } from "../api/apiClient";
import SubscriptionEditor from "../features/subscriptions/components/SubscriptionEditor";
import SavingsAnalysisPage from "../features/savings/SavingsAnalysisPage";
import SubscriptionListPage from "../features/subscriptions/SubscriptionListPage";
import { savingsAnalysis } from "../utils/subscriptionCalculations";
vi.mock("../api/apiClient", () => ({
  request: vi.fn(),
  money: (n) => Number(n || 0).toLocaleString("ko-KR") + "원",
  today: () => "2026-10-24",
}));
afterEach(() => {
  cleanup();
  request.mockReset();
  vi.restoreAllMocks();
});
it("monthly simulation counts yearly and weekly amounts and both video category labels", () => {
  const d = savingsAnalysis([
    {
      id: 1,
      category: "영상",
      amount: 12000,
      cycle: "yearly",
      status: "review",
    },
    {
      id: 2,
      category: "OTT/영상",
      amount: 1200,
      cycle: "weekly",
      status: "active",
    },
    {
      id: 3,
      category: "생활",
      amount: 2000,
      cycle: "monthly",
      status: "active",
    },
  ]);
  expect(d.total).toBe(8200);
  expect(d.saved).toBe(1000);
  expect(d.remaining).toBe(7200);
  expect([...d.duplicateIds]).toEqual([1, 2]);
  expect(d.categories.find((x) => x.category === "OTT/영상").amount).toBe(6200);
});
it("service selection sets name and category but saves the user entered price", async () => {
  const onSaved = vi.fn();
  request.mockImplementation(async (path, options) =>
    options?.method === "POST"
      ? { id: 1, ...options.body }
      : [
          {
            name: "넷플릭스",
            category: "OTT/영상",
            icon: "N",
            background: "#171717",
          },
        ],
  );
  render(<SubscriptionEditor onClose={() => {}} onSaved={onSaved} />);
  await screen.findByRole("option", { name: "넷플릭스" });
  fireEvent.change(screen.getByLabelText("서비스 빠른 선택"), {
    target: { value: "넷플릭스" },
  });
  expect(screen.getByLabelText("항목 이름").value).toBe("넷플릭스");
  expect(screen.getByLabelText("카테고리").value).toBe("OTT/영상");
  fireEvent.change(screen.getByLabelText("결제 금액 (원)"), {
    target: { value: "15900" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await waitFor(() =>
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "넷플릭스",
        category: "OTT/영상",
        amount: 15900,
      }),
    ),
  );
});
it("duplicate filter and persisted review action update the savings simulation", async () => {
  let rows = [
    {
      id: 1,
      name: "넷플릭스",
      category: "OTT/영상",
      amount: 15000,
      cycle: "monthly",
      day: 15,
      status: "active",
    },
    {
      id: 2,
      name: "디즈니플러스",
      category: "영상",
      amount: 50000,
      cycle: "monthly",
      day: 15,
      status: "active",
    },
    {
      id: 3,
      name: "Cloud",
      category: "생활",
      amount: 2000,
      cycle: "monthly",
      day: 15,
      status: "active",
    },
  ];
  request.mockImplementation(async (path, options) => {
    if (path.includes("/catalog")) return [];
    if (options?.method === "PUT") {
      const id = Number(path.split("/").pop());
      rows = rows.map((x) => (x.id === id ? { ...x, ...options.body } : x));
      return rows.find((x) => x.id === id);
    }
    return rows;
  });
  render(<SavingsAnalysisPage />);
  await screen.findByText("디즈니플러스");
  fireEvent.click(
    screen.getByRole("button", { name: "중복 카테고리", exact: true }),
  );
  expect(screen.queryByText("Cloud")).toBeNull();
  fireEvent.click(
    within(screen.getByText("디즈니플러스").closest("article")).getByRole("button",{name:"절약 검토",exact:true}),
  );
  await screen.findByRole("button", { name: "검토 해제" });
  expect(
    screen.getByRole("img", { name: /검토 항목 제외 시 17,000원/ }),
  ).toBeTruthy();
  expect(request).toHaveBeenCalledWith("/api/v1/subscriptions/2", {
    method: "PUT",
    body: expect.objectContaining({ status: "review" }),
  });
});
it("status filter isolates review rows while the database records remain intact", async () => {
  request.mockImplementation(async (path) =>
    path.includes("/catalog")
      ? []
      : [
          {
            id: 1,
            name: "Active",
            category: "음악",
            amount: 1000,
            cycle: "monthly",
            day: 1,
            status: "active",
          },
          {
            id: 2,
            name: "Review",
            category: "영상",
            amount: 2000,
            cycle: "monthly",
            day: 1,
            status: "review",
          },
        ],
  );
  render(<SubscriptionListPage />);
  await screen.findByText("Active");
  fireEvent.change(screen.getByLabelText("구독 상태 필터"), {
    target: { value: "review" },
  });
  expect(screen.queryByText("Active")).toBeNull();
  expect(screen.getByText("Review")).toBeTruthy();
  expect(request.mock.calls.every(([, options]) => !options?.method)).toBe(
    true,
  );
});
