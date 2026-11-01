import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import FreeTrialPage from "../domain/subscription/FreeTrialPage";
import MonthlyReportPage from "../domain/stats/MonthlyReportPage";
import SubscriptionComparisonPage from "../domain/subscription/SubscriptionComparisonPage";
import SavingsGoalPage from "../domain/stats/SavingsGoalPage";
import SupportCenterPage from "../domain/support/SupportCenterPage";
import CommunityActivityPage from "../domain/community/CommunityActivityPage";
import NotificationCenterPage from "../domain/user/NotificationCenterPage";
import SubscriptionDetailPage from "../domain/subscription/SubscriptionDetailPage";
import App from "../App";
import AdminPage from "../domain/admin/AdminPage";
import BrandLogo from "../global/components/BrandLogo";
import { apiRequest } from "../global/api/apiClient";
vi.mock("../global/api/apiClient", () => ({
  apiRequest: vi.fn(),
  formatWon: (n) => Number(n || 0).toLocaleString("ko-KR") + "원",
  getTodayDate: () => "2026-10-24",
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  apiRequest.mockReset();
});
it("saves a free trial through the API and displays the saved record", async () => {
  let items = [];
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === "POST") {
      items = [{ id: "trial-1", ...options.body }];
      return items[0];
    }
    return items;
  });
  render(<FreeTrialPage />);
  await screen.findByText("무료체험을 등록하면 종료 일정이 표시됩니다.");
  fireEvent.click(screen.getByRole("button", { name: "＋ 무료체험 등록" }));
  fireEvent.change(screen.getByLabelText("서비스 이름"), {
    target: { value: "My trial" },
  });
  fireEvent.change(screen.getByLabelText("전환 후 결제 금액 (원)"), {
    target: { value: "4900" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await screen.findByText("My trial");
  expect(apiRequest).toHaveBeenCalledWith("/api/v1/trials", {
    method: "POST",
    body: {
      name: "My trial",
      category: "영상",
      endDate: "2026-10-24",
      amount: 4900,
      notifyDays: 3,
      status: "ACTIVE",
    },
  });
});
it("monthly settlement uses server totals and does not invent missing comparisons", async () => {
  apiRequest.mockResolvedValue({
    month: "2026-10",
    total: 0,
    previousTotal: 0,
    hasPrevious: false,
    difference: null,
    paymentCount: 0,
    categories: [],
    history: [{ month: "2026-10", amount: 0 }],
  });
  render(<MonthlyReportPage navigate={() => {}} />);
  await screen.findByText("지난달 기록을 추가하면 변화를 비교할 수 있어요.");
  expect(screen.getByText("이번 달 결제 기록이 없습니다.")).toBeTruthy();
});
it("persists selected real catalog plan IDs", async () => {
  const plan = {
    id: "plan-1",
    service: "Video",
    plan: "Basic",
    category: "영상",
    amount: 9900,
    cycle: "monthly",
    features: ["HD"],
    sourceUrl: "https://example.com",
    updatedAt: "2026-10-24T00:00:00Z",
  };
  apiRequest.mockImplementation(async (path, options) =>
    options?.method === "PUT" ? null : path.endsWith("/selection") ? [] : [plan],
  );
  render(<SubscriptionComparisonPage />);
  await screen.findByText("Basic");
  fireEvent.click(screen.getByRole("button", { name: "비교에 추가" }));
  fireEvent.click(screen.getByRole("button", { name: "선택 저장" }));
  await screen.findByText("비교 선택을 계정에 저장했습니다.");
  expect(apiRequest).toHaveBeenCalledWith("/api/v1/comparison/selection", {
    method: "PUT",
    body: { ids: ["plan-1"] },
  });
});
it("goal checklist changes are saved on the server", async () => {
  let goal = {
    id: "goal-1",
    title: "Save",
    month: "2026-10",
    target: 10000,
    tasks: ["Check subscription"],
    completed: [false],
  };
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === "PUT") {
      goal = { ...goal, ...options.body };
      return goal;
    }
    return { goal, entries: [], saved: 0, percent: 0 };
  });
  render(<SavingsGoalPage navigate={() => {}} />);
  await screen.findByLabelText("Check subscription");
  fireEvent.click(screen.getByLabelText("Check subscription"));
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/goals/goal-1", {
      method: "PUT",
      body: { ...goal, completed: [true] },
    }),
  );
});
it("customer inquiries are submitted and appear under my inquiries", async () => {
  let items = [];
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === "POST") {
      items = [{ id: "q1", ...options.body, status: "OPEN", createdAt: "2026-10-24" }];
      return items[0];
    }
    return path.endsWith("/inquiries") ? items : [];
  });
  render(<SupportCenterPage user="member" navigate={() => {}} />);
  await screen.findByText("등록된 안내가 없습니다.");
  fireEvent.click(screen.getByRole("button", { name: "문의하기" }));
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "My question" },
  });
  fireEvent.change(screen.getByLabelText("문의 내용"), {
    target: { value: "Please help" },
  });
  fireEvent.click(screen.getByRole("button", { name: "문의 등록" }));
  await screen.findByText("My question");
  expect(screen.getByText("답변 대기")).toBeTruthy();
});
it("my activity opens the correct community post", async () => {
  const navigate = vi.fn();
  apiRequest.mockResolvedValue({
    posts: [{ id: 42, title: "My post", category: "자유", createdAt: "2026-10-24" }],
    comments: [],
    likes: [],
  });
  render(<CommunityActivityPage navigate={navigate} />);
  await screen.findByText("My post");
  fireEvent.click(screen.getByRole("button", { name: "글 보기" }));
  expect(navigate).toHaveBeenCalledWith("community", 42);
});
it("notifications support read all through the real endpoint", async () => {
  let rows = [
    {
      id: "n1",
      title: "Upcoming",
      content: "Tomorrow",
      read: false,
      createdAt: "2026-10-24",
      page: "trials",
    },
  ];
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === "POST") rows = rows.map((x) => ({ ...x, read: true }));
    return rows;
  });
  render(<NotificationCenterPage navigate={() => {}} />);
  await screen.findByText("Upcoming");
  fireEvent.click(screen.getByRole("button", { name: "모두 읽음" }));
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/notifications/read-all", {
      method: "POST",
    }),
  );
  await screen.findByRole("button", { name: "읽지 않음 0" });
});
it("subscription management notes are saved", async () => {
  apiRequest.mockImplementation(async (path, options) =>
    options?.method === "PUT"
      ? null
      : {
          subscription: {
            id: 1,
            name: "Music",
            amount: 1000,
            category: "음악",
            cycle: "monthly",
            day: 1,
            status: "active",
          },
          payments: [],
          changes: [],
          note: "",
          totalPaid: 0,
        },
  );
  render(<SubscriptionDetailPage id={1} navigate={() => {}} />);
  await screen.findByLabelText("구독 관리 메모");
  fireEvent.change(screen.getByLabelText("구독 관리 메모"), {
    target: { value: "Review later" },
  });
  fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));
  await screen.findByText("메모를 저장했습니다.");
  expect(apiRequest).toHaveBeenCalledWith("/api/v1/subscriptions/1/note", {
    method: "PUT",
    body: { note: "Review later" },
  });
});
it("old account recovery links return guests to ordinary login", async () => {
  window.history.replaceState({}, "", "/#recovery");
  apiRequest.mockRejectedValue(new Error("Unauthorized"));
  render(<App />);
  await screen.findByRole("heading", { name: "로그인", exact: true });
  expect(screen.queryByLabelText("가입 시 인증한 이메일")).toBeNull();
  expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/api/recovery/"))).toBe(false);
  window.history.replaceState({}, "", "/");
});
it("admin can create published content through the admin API", async () => {
  apiRequest.mockImplementation(async (path) =>
    path.endsWith("/overview")
      ? { members: 1, posts: 0, reports: 0, openInquiries: 0 }
      : path.includes("/members")
        ? { content: [], total: 0 }
        : [],
  );
  render(<AdminPage user="admin" />);
  await screen.findByText("회원 목록");
  fireEvent.click(screen.getByRole("button", { name: "공지사항", exact: true }));
  await screen.findByText("공지사항 관리");
  fireEvent.click(screen.getByRole("button", { name: "＋ 등록" }));
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "Notice" },
  });
  fireEvent.change(screen.getByLabelText("내용"), {
    target: { value: "New announcement" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/content/notice", {
      method: "POST",
      body: {
        title: "Notice",
        category: "이용 안내",
        content: "New announcement",
        published: true,
      },
    }),
  );
});
it("the shared logo is consistent across authentication and the app", () => {
  render(<BrandLogo />);
  expect(screen.getByText("R")).toBeTruthy();
  expect(screen.getByText("루틴슬림")).toBeTruthy();
  expect(screen.queryByText("◉")).toBeNull();
});
it("cannot overwrite a saved comparison before its selection has loaded", async () => {
  let finish;
  const plan = {
    id: "plan-1",
    service: "Video",
    plan: "Basic",
    category: "영상",
    amount: 9900,
    cycle: "monthly",
    features: [],
    updatedAt: "2026-10-24",
  };
  apiRequest.mockImplementation((path) =>
    path.endsWith("/selection")
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve([plan]),
  );
  render(<SubscriptionComparisonPage />);
  await screen.findByText("Basic");
  expect(screen.getByRole("button", { name: "선택 저장" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "비교에 추가" }).disabled).toBe(true);
  finish([plan]);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "선택 저장" }).disabled).toBe(false),
  );
  expect(screen.getByRole("button", { name: "선택 해제" })).toBeTruthy();
});
