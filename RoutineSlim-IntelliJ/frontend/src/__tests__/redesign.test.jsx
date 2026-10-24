import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { request } from "../api/apiClient";
import PaymentCalendarPage from "../features/payments/PaymentCalendarPage";
import SubscriptionListPage from "../features/subscriptions/SubscriptionListPage";
import LoginPage from "../features/auth/LoginPage";
import CommunityPage from "../features/community/CommunityPage";
vi.mock("../api/apiClient", () => ({
  request: vi.fn(),
  money: (n) => Number(n || 0).toLocaleString("ko-KR") + "원",
  today: () => "2026-10-24",
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  request.mockReset();
});
it("calendar date selection filters real events and month navigation reloads data", async () => {
  request.mockResolvedValue([
    {
      subscriptionId: 1,
      name: "Music",
      date: "2026-10-24",
      amount: 1000,
      category: "음악",
    },
  ]);
  render(<PaymentCalendarPage />);
  await screen.findByRole("button", { name: "10월 24일 결제 1건" });
  fireEvent.click(screen.getByRole("button", { name: "10월 25일 결제 0건" }));
  await screen.findByText("선택한 날짜의 결제 예정 항목이 없습니다.");
  fireEvent.click(screen.getByText("전체 일정"));
  await screen.findByRole("heading", { name: "결제 예정 목록" });
  fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/v1/calendar/events?year=2026&month=11",
    ),
  );
});
it("subscription table searches and opens details without changing records", async () => {
  request.mockResolvedValue([
    {
      id: 1,
      name: "Music",
      category: "음악",
      amount: 1000,
      cycle: "monthly",
      day: 1,
      status: "active",
    },
    {
      id: 2,
      name: "Video",
      category: "영상",
      amount: 2000,
      cycle: "monthly",
      day: 2,
      status: "active",
    },
  ]);
  const open = vi.fn();
  render(<SubscriptionListPage onDetails={open} />);
  await screen.findByText("Music");
  fireEvent.change(screen.getByLabelText("구독 검색"), {
    target: { value: "Music" },
  });
  expect(screen.queryByText("Video")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "상세" }));
  expect(open).toHaveBeenCalledWith(1);
});
it("reference-inspired login still opens the improved consent signup", async () => {
  request.mockImplementation(async (path) =>
    path.endsWith("/policy")
      ? {
          termsVersion: "2026-10-24",
          privacyVersion: "2026-10-24",
          mailAvailable: true,
          terms: "약관",
          privacy: "개인정보",
        }
      : {},
  );
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByRole("heading", { name: /구독, 고정비를/ })).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "회원가입", exact: true }),
  );
  await screen.findByText("서비스 이용약관 동의 (필수)");
  expect(screen.getByRole("button", { name: "동의하고 다음" }).disabled).toBe(
    true,
  );
});
it("composer persists toolbar formatting through the existing post API", async () => {
  request.mockResolvedValue([]);
  render(<CommunityPage user="user" />);
  fireEvent.click(screen.getByRole("button", { name: /글쓰기/ }));
  fireEvent.change(screen.getByPlaceholderText("제목"), {
    target: { value: "Formatted post" },
  });
  const area = screen.getByPlaceholderText("내용을 입력하세요");
  fireEvent.change(area, { target: { value: "Text" } });
  area.setSelectionRange(0, 4);
  fireEvent.click(screen.getByRole("button", { name: "굵게" }));
  expect(area.value).toBe("**Text**");
  fireEvent.click(screen.getByRole("button", { name: "글 작성" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/v1/community/posts", {
      method: "POST",
      body: {
        title: "Formatted post",
        content: "**Text**",
        category: "자유",
        images: [],
        tags: [],
      },
    }),
  );
});
